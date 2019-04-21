export interface Model {
  property: List;
}

export enum List {
  KEY = 'VALUE'
}

export const CONSTANT = {
  a: 1,
  b: [2, 3, 4],
  c: 'a'
}

export const { a, b: [b1, b2, b3], c } = CONSTANT

export interface Type {
  a: any,
  b: any
}
