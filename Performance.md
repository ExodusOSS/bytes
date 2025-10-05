# Performance

All data in ops/sec

## fromBase64

Notes:

1. `Buffer` and `base64-js` do not perform proper validation
2. Firefox seems to be slow in native `fromBase64`, hopefully should be fixed upstream. Not catastrophic though

| Engine                | `@exodus/bytes` | `Buffer`  | `base64-js` | `fast-base64-decode` | `@scure/base`|
| --------------------- | --------------- | --------- | ----------- | -------------------- | ------------- |
| Node.js 25            | 831,947         | 1,218,027 | 120,409     | 139,704              | 220,799       |
| Node.js 22            | 200,723         | 1,062,699 | 109,818     | 117,689              | 5,649         |
| Chrome                | 582,751         | 28,529    | 97,399      | 91,861               | 193,874       |
| Safari                | 221,779         | 27,020    | 199,322     | 210,128              | 85,426        |
| Firefox               | 52,119 (note 2) | 26,070    | 97,238      | 112,701              | 46,281        |
| Chrome (old)          | 90,984          | 28,696    | 98,814      | 91,777               | 4,481         |
| Safari (old)          | 183,083         | 26,851    | 205,002     | 206,654              | 9,907         |
| Firefox (old)         | 128,025         | 26,785    | 101,595     | 114,732              | 4,122         |
| v8                    | 600,240         | 29,950    | 138,966     | 119,531              | 200,321       |
| JavaScriptCore        | 221,337         | 26,782    | 185,082     | 207,555              | 85,492        |
| SpiderMonkey          | 46,531 (note 2) | 27,917    | 102,417     | 115,154              | 43,033        |
| v8 (old)              | 124,549         | 29,509    | 136,463     | 119,432              | 4,599         |
| JavaScriptCore (old)  | 178,031         | 26,593    | 183,520     | 205,255              | 8,377         |
| SpiderMonkey (old)    | 107,285         | 27,926    | 101,041     | 114,626              | 4,445         |
| Hermes / React Native | 5461            | 715       | 2512        | 2661                 | 354           |

## toBase64

Notes:

1. `Buffer.from` is separate because it is common to see `Buffer.from(uint8).toString(...`, despite that being a copy
2. Firefox seems to be slow in native `toBase64`, hopefully should be fixed upstream. Not catastrophic though

| Engine                | `@exodus/bytes` | `Buffer`  | `Buffer.from` | `base64-js` | `@scure/base` |
| --------------------- | --------------- | --------- | ------------- | ----------- | ------------- |
| Node.js 25            | 2,659,574       | 1,663,894 | 1,168,224     | 26,860      | 2,688,172     |
| Node.js 22            | 1,683,502       | 1,680,672 | 974,659       | 25,445      | 5,126         |
| v8 / Chrome           | 2,702,703       | 26,217    | 26,924        | 27,271      | 2,652,520     |
| JSC / Safari          | 1,782,531       | 14,863    | 14,758        | 14,975      | 1,919,386     |
| SM / Firefox          | 97,116 (note 2) | 27,258    | 26,613        | 28,839      | 95,584        |
| Chrome (old)          | 202,511         | 24,497    | 24,329        | 25,202      | 4,283         |
| Safari (old)          | 221,828         | 17,797    | 17,834        | 18,024      | 7,150         |
| Firefox (old)         | 184,672         | 26,310    | 25,332        | 27,974      | 7,974         |
| v8 (old)              | 78,759          | 26,217    | 26,924        | 27,271      | 4,274         |
| JSC (old)             | 111,321         | 14,863    | 14,758        | 14,975      | 7,641         |
| SM (old)              | 77,574 (note 2) | 27,258    | 26,613        | 28,839      | 8,774         |
| Hermes / React Native | 5032            | 2004      | 2011          | 2040        | 359           |

## fromHex

Notes:

1. `Buffer` does not perform proper validation
2. Firefox seems to be slow in native `fromHex`, hopefully should be fixed upstream. Not catastrophic though

| Engine                | `@exodus/bytes` | `Buffer`  | `@scure/base` |
| --------------------- | --------------- | --------- | ------------- |
| Node.js 25            | 901,713         | 319,591   | 903,342       |
| Node.js 22            | 116,645         | 282,326   | 3,862         |
| v8 / Chrome           | 682,594         | 8,661     | 652,316       |
| JSC / Safari          | 1,360,544       | 6,585     | 1,360,544     |
| SM / Firefox          | 28,403 (note 2) | 12,046    | 28,297        |
| Chrome (old)          | 70,259          | 8,665     | 3,869         |
| Safari (old)          | 148,588         | 6,449     | 8,239         |
| Firefox (old)         | 109,481         | 12,819    | 3,822         |
| v8 (old)              | 68,578          | 7,577     | 4,056         |
| JSC (old)             | 129,500         | 6,585     | 7,753         |
| SM (old)              | 85,310          | 12,046    | 4,000         |
| Hermes / React Native | 2945            | 1764      | 282           |

## toHex

Notes:

1. `Buffer.from` is separate because it is common to see `Buffer.from(uint8).toString(...`, despite that being a copy
2. Firefox seems to be slow in native `toHex`, hopefully should be fixed upstream. Not catastrophic though

| Engine                | `@exodus/bytes` | `Buffer`  | `Buffer.from` | `@scure/base` |
| --------------------- | --------------- | --------- | ------------- | ------------- |
| Node.js 25            | 643,915         | 389,105   | 365,631       | 567,537       |
| Node.js 22            | 398,406         | 396,040   | 380,807       | 3,762         |
| v8 / Chrome           | 611,995         | 74,599    | 71,480        | 607,903       |
| JSC / Safari          | 1,420,455       | 63,363    | 61,372        | 1,414,427     |
| SM / Firefox          | 53,135 (note 2) | 71,378    | 66,326        | 51,188        |
| v8 / Chrome (old)     | 80,045          | 74,074    | 72,025        | 3,624         |
| JSC / Safari (old)    | 68,866          | 62,937    | 60,968        | 7,172         |
| SM / Firefox (old)    | 80,775          | 71,669    | 66,644        | 6,683         |
| Hermes / React Native | 5107            | 4529      | 4550          | 299           |
