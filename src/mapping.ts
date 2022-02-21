import { Bytes, BigInt, log } from '@graphprotocol/graph-ts'
import { StorePixelsCall } from './types/MOVRPlace/MOVRPlaceABI'
import { Bucket, Account, Charity } from './types/schema'


export type BucketArray = {
  [bucketIndex: number]: number[];
}

export function handleStorePixels(call: StorePixelsCall): void {

  let id = call.transaction.hash.toHex()

  let pixelInputs: Array<any>

  for (let step = 0; step < call.inputs.pixelInputs.length; step++) {
    // Runs 5 times, with values of step 0 through 4.

    const _pixelInput = call.inputs.pixelInputs[step]
    pixelInputs.push({
      bucket: _pixelInput.bucket,
      posInBucket: _pixelInput.posInBucket,
      color: _pixelInput.color,
    })
  }

  let bucketArr: BucketArray = {}
  let bucketLength = 16

  for(let i = 0; i < pixelInputs.length; i++) {
    const bucketId = pixelInputs[i].bucket.toString()
    const posInBucket = pixelInputs[i].posInBucket
    const color = pixelInputs[i].color

    if (bucketArr[bucketId] == null || bucketArr[bucketId].length <= 0)
    bucketArr[bucketId] = Array<number>(bucketLength).fill(0);

    bucketArr[bucketId][posInBucket] = color;
  }

  for(let i = 0; i < pixelInputs.length; i++) {
    const pixelInput = pixelInputs[i]
    const bucketId: string = pixelInput.bucket.toString()

    const bucket = Bucket.load(bucketId)

    if(!bucket) {
      let bucket = new Bucket(bucketId)

      bucket.position = pixelInput.bucket
      bucket.pixels = bucketArr[bucketId]
      bucket.lastBlockUpdated = call.block.number

      bucket.save()
    } else {
      // bucket exists

      let oldPixels = bucket.pixels
      let newPixels = bucketArr[bucketId]

      let combinedPixels = []

      for(let i = 0; i < bucket.pixels.length; i++) {
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
      bucket.lastBlockUpdated = call.block.number

      log.info(`UPDATED BUCKET #{}: New Array: {}`, [bucketId, combinedPixels.toString()])

      bucket.save()
    }
  }
}