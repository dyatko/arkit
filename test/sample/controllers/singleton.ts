import { List, Model, CONSTANT, a, b1, b2, b3, c } from "../models/model";

class Singleton {
  model: Model = {
    property: List.KEY
  };

  state = {
    user: undefined
  }

  onStateChanged(evt) {
    const isEmpty = value => value === "";
    const isReset = isEmpty(evt.target.value);
    const user = { ...this.state.user, [evt.target.id]: evt.target.value };
    const isFormComplete = !isReset && !Object.values(user).some(isEmpty);
    this.setState({ user, isFormComplete });
  }

  setState(state) {
  }
}

export const singleton = new Singleton();
