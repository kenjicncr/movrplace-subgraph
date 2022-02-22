import { Bytes, BigInt, log, store } from '@graphprotocol/graph-ts'
import { StorePixelsCall } from './types/MOVRPlace/MOVRPlaceABI'
import { Bucket, Account, Charity } from './types/schema'

// globals 
let pixelArr: Array<BigInt>
// let bucket: Bucket | null
let bucketMapping = new Map<string, Array<BigInt>>()

let oldPixelArr: Array<BigInt>
let newPixelArr: Array<BigInt>
let combinedPixelArr: Array<BigInt>
let blockNumber: BigInt

export function handleStorePixels(call: StorePixelsCall): void {

  let id = call.transaction.hash.toHex()
  blockNumber = call.block.number

  let pixelInputs = new Array<Map<string,BigInt>>()

  for (let step = 0; step < call.inputs.pixelInputs.length; step++) {
    // Runs 5 times, with values of step 0 through 4.

    const _pixelInput = call.inputs.pixelInputs[0]

    let pixelInputObject = new Map<string,BigInt>()

    pixelInputObject.set("bucket", _pixelInput.bucket)
    pixelInputObject.set("posInBucket", _pixelInput.posInBucket)
    pixelInputObject.set("color", new BigInt(_pixelInput.color))

    pixelInputs.push(pixelInputObject)
  }

  let bucketLength = 16

  for(let i = 0; i < pixelInputs.length; i++) {
    let _pixelInput = pixelInputs[i]
    let bucketId = _pixelInput.get("bucket").toString()
    let posInBucket = parseInt(pixelInputs[i].get("posInBucket").toString()) as i32
    const color = pixelInputs[i].get("color")

    if (bucketMapping.get(bucketId) == null || bucketMapping.get(bucketId).length <= 0) {
      let arr = new Array<BigInt>(bucketLength).fill(new BigInt(0))

      bucketMapping.set(bucketId, arr)
      bucketMapping.get(bucketId)[posInBucket] = color
    }
  }


  pixelInputs.forEach((pixelInput) => {
    const bucketId = pixelInput.get("bucket").toString()

    let bucket = Bucket.load(bucketId)

    if(!bucket) {
      let bucket = new Bucket(bucketId)
      bucket.position = pixelInput.get("bucket")
      pixelArr = bucketMapping.get(bucketId)
      bucket.pixels = pixelArr
      bucket.lastBlockUpdated = blockNumber

      bucket.save()
    }

    if(bucket) {

      oldPixelArr = bucket.pixels
      newPixelArr = bucketMapping.get(bucketId)

      for(let i = 0; i < 16; i++) {
        const newPixel = newPixelArr[i]

        // if position is 0, it means no need to override
        // and save the old one
        if(newPixel === new BigInt(0)) {
          combinedPixelArr[i] = oldPixelArr[i]
        } else {
          combinedPixelArr[i] = newPixelArr[i]
        }
      }

      bucket.pixels = combinedPixelArr
      bucket.lastBlockUpdated = blockNumber

      log.info("UPDATED BUCKET #{}", [bucketId])
      bucket.save()
    }
  })
}