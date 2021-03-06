/*
 * MIT License
 *
 * Copyright (c) 2017 Aleix Morgadas <aleixmorgadas@openmailbox.org>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {Component, ViewChild} from "@angular/core";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {LoadingController, ModalController, NavController, Slides, ToastController} from "ionic-angular";
import {Account, AccountHttp, Address, NEMLibrary, NetworkTypes, SimpleWallet} from "nem-library";
import {Storage} from "@ionic/storage";
import {HomePage} from "../home/home";
import {SetupAccountModal} from "./setup-account.modal";
import {AccountService} from "../../services/account.service";
import {TranslateService} from "@ngx-translate/core";

@Component({
  selector: 'page-setup',
  templateUrl: 'setup.html'
})
export class SetupPage {
  // Visual
  NEMLibrary = NEMLibrary;
  NetworkTypes = NetworkTypes;

  form: FormGroup;
  @ViewChild(Slides) slides: Slides;
  account: Account;
  wallet: SimpleWallet;
  multisigAddress: Address;

  constructor(public navCtrl: NavController,
              private formBuilder: FormBuilder,
              private toastCtrl: ToastController,
              private modalCtrl: ModalController,
              private loadingCtrl: LoadingController,
              private storage: Storage,
              private accountService: AccountService,
              private translateService: TranslateService) {
    this.form = formBuilder.group({
      myAccount: [false, Validators.requiredTrue]
    });
  }

  confirm() {
    let saveWalletPromise = this.storage.set('WALLET', this.wallet.writeWLTFile()).then(_ => {
      this.storage.set('MULTISIG_ADDRESS', this.multisigAddress.plain()).then(_ => {
        this.accountService.setAccount(this.account);
        this.accountService.setMultisig(this.multisigAddress);
        this.navCtrl.setRoot(HomePage);
      })
    });
  }

  openSetupAccountModal() {
    let modal = this.modalCtrl.create(SetupAccountModal);
    modal.onDidDismiss((wallet: { wallet: SimpleWallet, account: Account }) => {
      if (wallet != null) {
        let loader;
        this.wallet = wallet.wallet;
        this.account = wallet.account;
        this.translateService.get("LOADING_FETCHING_TEXT").subscribe(value => {
          loader = this.loadingCtrl.create({
            content: value
          });
          loader.present();
        });
        new AccountHttp().getFromAddress(this.account.address).subscribe(accountMetaData => {
          // Check that the account is Cosignatory of just one account
          if (accountMetaData.cosignatoryOf.length != 1) {
            this.translateService.get("ERROR_NO_COSIG").subscribe(value => {
              this.toastCtrl.create({
                message: value,
                duration: 2000
              }).present();
            });
          } else {
            this.multisigAddress = accountMetaData.cosignatoryOf[0].publicAccount.address;
          }
          loader.dismiss();
          this.slides.lockSwipeToNext(false);
          this.slides.slideNext(500);
        }, err => {
          loader.dismiss();
          this.translateService.get("ERROR_OFFLINE").subscribe(value => {
            this.toastCtrl.create({
              message: value,
              duration: 2000
            }).present()
          });
        });
      }
    });
    modal.present();
  }

  slideChanged() {
    let currentIndex = this.slides.getActiveIndex();
    if (currentIndex == 2 && this.account === undefined) {
      this.slides.lockSwipeToNext(true);
    } else {
      this.slides.lockSwipeToNext(false);
    }
  }
}
