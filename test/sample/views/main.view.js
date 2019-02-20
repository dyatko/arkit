import Component from './component'
import { singleton } from '../controllers/singleton'

class MainView {
  constructor () {
    this.component = new Component()
    this.controller = singleton
  }
}

export const mainView = new MainView()
