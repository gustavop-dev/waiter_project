export class OdooError extends Error {
  readonly odooType: string

  constructor(message: string, odooType: string) {
    super(message)
    this.name = 'OdooError'
    this.odooType = odooType
  }
}
