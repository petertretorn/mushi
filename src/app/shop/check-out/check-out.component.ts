import { AngularFirestore, AngularFirestoreCollection } from 'angularfire2/firestore';
import { Router } from '@angular/router';
import { ShoppingCartService } from '@app/core/shopping-cart.service';
import { AuthService } from '@app/core/auth.service';
import { Component, OnInit } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Payment } from '@app/models/payment.model';
import { User } from '@app/models/user.model';

@Component({
  selector: 'app-check-out',
  templateUrl: './check-out.component.html',
  styleUrls: ['./check-out.component.css']
})
export class CheckOutComponent implements OnInit {
  userId: string;

  user: User

  paymentRef: AngularFirestoreCollection<Payment>;
  ordersRef: AngularFirestoreCollection<{}>;

  fullName: string
  street: string
  zipAndCity: string

  total: number = 0
  handler: any

  isAuthenticated = false

  constructor(
    private auth: AuthService,
    private cartService: ShoppingCartService,
    private router: Router,
    private db: AngularFirestore) {
    this.paymentRef = this.db.collection('payments')
    this.ordersRef = this.db.collection('orders')

    this.auth.user.subscribe((user) => {
      if (user) {
        this.userId = user.uid
        this.user = user
      }
    });
  }

  ngOnInit() {
    this.setUpStripe()

    this.total = this.cartService.totalAmount() * 100

    this.auth.user.subscribe(user => {

      if (user) {
        this.fullName = user.fullName || ''
        this.street = user.street || ''
        this.zipAndCity = user.zipAndCity || ''

        console.log('init check-out auth')
        this.isAuthenticated = true
      }
    })
  }

  setUpStripe() {
    this.handler = StripeCheckout.configure({
      key: environment.stripe,
      image: '/assets/images/chagabaggrund.jpg',
      locale: 'da',
      token: token => {
        this.processPayment(token, this.total)
      }
    });
  }

  processPayment(token, amount) {
    //TODO

    if (!this.userId) {
      console.log('cannot process payment, unauthenticated')
      return
    }

    const payment = { token, amount }

    this.paymentRef.doc(this.userId).set(payment)

    console.log('stripe callback')
    console.log(`token : ${token}`)
    console.log(`amount : ${amount}`)
  }

  signInGoogle() {
    this.auth.googleLogin().then(() => {
      console.log('auth success')
    }, () => {
      console.log('auth failed')
    })
  }

  gotoPayment() {

    const addressInfo = { 
      fullName: this.fullName, 
      street: this.street, 
      zipAndCity: this.zipAndCity 
    }

    Object.assign(this.user, addressInfo)

    const order = {
      date: new Date(),
      lines: this.cartService.getLines(),
      uid: this.user.uid,
      shipping: addressInfo
    }

    this.ordersRef.add( JSON.parse( JSON.stringify(order))).then( res => {
      this.user.orders = this.user.orders || []
      this.user.orders.push(res.id);
      
      this.auth.updateUserData(this.user)
    })

    this.handler.open({
      name: 'Mushi Mushi',
      excerpt: 'Betal for køb',
      currency: 'dkk',
      amount: this.total
    });
  }
}