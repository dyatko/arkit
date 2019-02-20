import { List, Model } from '../models/model'

class Singleton {
  model: Model = {
    property: List.KEY
  }
}

export const singleton = new Singleton()
