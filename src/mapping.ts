import { Bytes, BigInt, log, store, ethereum } from '@graphprotocol/graph-ts'
import { StorePixelsCall, StorePixelsCallPixelInputsStruct } from './types/MOVRPlace/MOVRPlaceABI'
import { Bucket, Account, Charity } from './types/schema'

// globals 
let pixelArr: Array<i32>
// let bucket: Bucket | null
let bucketMapping = new Map<string, Array<i32>>()

let oldPixelArr: Array<i32>
let newPixelArr: Array<i32> 
let combinedPixelArr: Array<i32>
let blockNumber: BigInt
let bucketLength: i32
let _pixelInput: StorePixelsCallPixelInputsStruct

export function handleStorePixels(call: StorePixelsCall): void {
  let pixelInputs = call.inputs.pixelInputs
  let totalPixelInputs = call.inputs.pixelInputs.length

  const bucketLength = 16;

  for(let i = 0; i < totalPixelInputs; i++) {
    const _pixelInput = pixelInputs[i]
    const posInBucket: i32 = _pixelInput.posInBucket.toI32()
    const color = _pixelInput.color
    const bucketIdString = _pixelInput.bucket.toString()
    const bucketItem: Array<i32> | null = bucketMapping.has(bucketIdString) ? bucketMapping.get(bucketIdString) : []

    if (!bucketItem || bucketItem.length <= 0) {
      let newArr: Array<i32> =  new Array<i32>(bucketLength).fill(0)
      newArr[posInBucket] = color
      bucketMapping.set(bucketIdString, newArr)
    }
  }

  for(let i = 0; i < totalPixelInputs; i++) {
    const _pixelInput = pixelInputs[i]
    const posInBucket: i32 = _pixelInput.posInBucket.toI32()
    const color = _pixelInput.color
    const bucketId = _pixelInput.bucket.toString()
    const emptyBucketPixels: Array<i32> =  new Array<i32>(bucketLength).fill(0)
    const bucketPixels: Array<i32>  = bucketMapping.has(bucketId) ? bucketMapping.get(bucketId) : emptyBucketPixels
    const lastBlockUpdated = call.block.number.toI32()


    let bucket = Bucket.load(bucketId)

    if(!bucket) {
      bucket = new Bucket(bucketId)
      bucket.position = posInBucket
      bucket.pixels = bucketPixels
      bucket.lastBlockUpdated = lastBlockUpdated

      bucket.save()
    } else {
      // bucket exists
      
      let oldPixels = bucket.pixels
      let newPixels = bucketPixels

      let combinedPixels: Array<i32> =  new Array<i32>(bucketLength).fill(0)

      for(let i = 0; i < bucketLength; i++) {
        const newPixel = newPixels[i]

        // if position is 0, it means no need to override
        // and save the old one
        if(newPixel === 0) {
          combinedPixels[i] = oldPixels[i]
        } else {
          combinedPixels[i] = newPixels[i]
        }
      }

      bucket.pixels = combinedPixels
      
      // update block #
      bucket.lastBlockUpdated = lastBlockUpdated
      
      bucket.save()
    }
  }
  

  // Add accounts

  let accountAddress = call.from
  let accountId = accountAddress.toHexString()

  let account = Account.load(accountId)

  if(!account) {
    account = new Account(accountId)
    account.address = accountAddress
    account.totalPixelsPlaced = totalPixelInputs
    log.info("New item", [account.totalPixelsPlaced.toString()])
    account.save()
  } else {
    let newTotal =  totalPixelInputs + account.totalPixelsPlaced
    account.totalPixelsPlaced = newTotal

    account.save()
  }

  // new charity
  let charityId = call.inputs._id

  let charity = Charity.load(charityId)

  if(!charity) {
    charity = new Charity(charityId)
    charity.name = charityId
    charity.totalPixels = totalPixelInputs
    charity.save()
  } else {
    charity.totalPixels = charity.totalPixels + totalPixelInputs
    charity.save()
  }
}