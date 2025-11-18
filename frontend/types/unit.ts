export interface Unit {
  _id: string
  unitNumber: string
  type: string
  status: string
  floor: number
  size: number
  bedrooms?: number
  bathrooms?: number
  rentPrice?: number
  salePrice?: number
  images?: string[]
  imageUrl?: string
  building?: {
    _id: string
    name: string
    address?: string
    image?: string
    imageUrl?: string
  }
  proprietaire?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  locataire?: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  createdAt?: string
  updatedAt?: string
}

