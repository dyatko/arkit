import { List, Model, CONSTANT, a, b1, b2, b3, c } from '../models/model'

class Singleton {
  model: Model = {
    property: List.KEY
  }
}

export const singleton = new Singleton()
