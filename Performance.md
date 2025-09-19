# Performance

All data in ops/sec

## fromBase64

Notes:

1. `Buffer` and `base64-js` do not perform proper validation
2. Firefox seems to be slow in native `fromBase64`, hopefully should be fixed upstream. Not catastrophic though
3. Old Safari can be improved ~1.4x by detecting and using pure js impl. Not very significant though

| Engine                | `@exodus/bytes` | `Buffer` | `base64-js` | `@scure/base` |
| --------------------- | --------------- | -------- | ----------- | ------------- |
| Node.js 25            | TODO            | TODO     | TODO        | TODO          |
| Node.js 22            | 200,562         | 896,057  | 105,955     | 5,678         |
| v8 / Chrome           | 605,694         | 30,099   | 138,351     | 202,184       |
| v8 / Chrome (old)     | 91,258          | 30,099   | 138,351     | 4,455         |
| JSC / Safari          | 226,142         | 27,999   | 204,165     | 88,137        |
| JSC / Safari (old)    | 42,816 (note 3) | 27,999   | 204,165     | 9,369         |
| SM / Firefox          | 46,902 (note 2) | 24,900   | 102,501     | 43,952        |
| SM / Firefox (old)    | 68,918          | 24,900   | 102,501     | 4,648         |
| Hermes / React Native | 3834            | 722      | 2508        | 350           |

## toBase64

Notes:

1.  `Buffer.from` is separate because it is common to see `Buffer.from(uint8).toString(...`, despite that being a copy

| Engine                | `@exodus/bytes` | `Buffer`  | `Buffer.from` | `base64-js` | `@scure/base` |
| --------------------- | --------------- | --------- | ------------- | ----------- | ------------- |
| Node.js 25            | TODO            | TODO      | TODO          | TODO        | TODO          |
| Node.js 22            | 1,683,502       | 1,680,672 | 974,659       | 25,445      | 5,126         |
| v8 / Chrome           | 2,688,172       | 26,371    | 26,897        | 27,169      | 2,666,667     |
| v8 / Chrome (old)     | 58,469          | 26,371    | 26,897        | 27,169      | 4,238         |
| JSC / Safari          | 1,736,111       | 14,723    | 14,551        | 14,766      | 1,886,792     |
| JSC / Safari (old)    | 50,878          | 14,723    | 14,551        | 14,766      | 7,756         |
| SM / Firefox          | 97,116          | 27,258    | 26,613        | 28,839      | 95,584        |
| SM / Firefox (old)    | 60,569          | 27,258    | 26,613        | 28,839      | 8,774         |
| Hermes / React Native | 3001            | 1993      | 2020          | 2037        | 358           |

## fromHex

Notes:

1.  `Buffer` does not perform proper validation
2.  Firefox seems to be slow in native `fromHex`, hopefully should be fixed upstream. Not catastrophic though

| Engine                | `@exodus/bytes` | `Buffer` | `@scure/base` |
| --------------------- | --------------- | -------- | ------------- |
| Node.js 25            | TODO            | TODO     | TODO          |
| Node.js 22            | 70,862          | 272,926  | 4,037         |
| v8 / Chrome           | 652,316         | 7,611    | 642,261       |
| v8 / Chrome (old)     | 66,503          | 7,611    | 3,926         |
| JSC / Safari          | 1,360,544       | 6,542    | 1,356,852     |
| JSC / Safari (old)    | 78,703          | 6,542    | 7,889         |
| SM / Firefox          | 29,495 (note 2) | 12,201   | 28,898        |
| SM / Firefox (old)    | 41,729          | 12,201   | 3,865         |
| Hermes / React Native | 2162            | 1788     | 279           |

## toHex

Notes:

1.  `Buffer.from` is separate because it is common to see `Buffer.from(uint8).toString(...`, despite that being a copy
2.  Firefox seems to be slow in native `toHex`, hopefully should be fixed upstream. Not catastrophic though

| Engine                | `@exodus/bytes` | `Buffer` | `Buffer.from` | `@scure/base` |
| --------------------- | --------------- | -------- | ------------- | ------------- |
| Node.js 25            | TODO            | TODO     | TODO          | TODO          |
| Node.js 22            | 398,406         | 396,040  | 380,807       | 3,762         |
| v8 / Chrome           | 611,995         | 74,599   | 71,480        | 607,903       |
| v8 / Chrome (old)     | 79,783          | 74,599   | 71,480        | 3,618         |
| JSC / Safari          | 1,420,455       | 63,363   | 61,372        | 1,414,427     |
| JSC / Safari (old)    | 67,833          | 63,363   | 61,372        | 6,838         |
| SM / Firefox          | 53,135 (note 2) | 71,378   | 66,326        | 51,188        |
| SM / Firefox (old)    | 78,827          | 71,378   | 66,326        | 7,100         |
| Hermes / React Native | 4412            | 4504     | 4567          | 293           |
