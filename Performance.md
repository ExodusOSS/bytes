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
| v8 / Chrome           | 641,026         | 31,458   | 140,944     | 207,426       |
| v8 / Chrome (old)     | 95,202          | 31,458   | 140,944     | 4,500         |
| JSC / Safari          | 237,248         | 28,646   | 195,198     | 90,992        |
| JSC / Safari (old)    | 45,185 (note 3) | 28,646   | 195,198     | 10,419        |
| SM / Firefox          | 49,682 (note 2) | 28,583   | 103,008     | 46,281        |
| SM / Firefox (old)    | 73,314          | 28,583   | 103,008     | 4,680         |
| Hermes / React Native | 4014            | 731      | 2484        | 353           |

## toBase64

Notes:

1.  `Buffer.from` is separate because it is common to see `Buffer.from(uint8).toString(...`, despite that being a copy

| Engine                | `@exodus/bytes` | `Buffer`  | `Buffer.from` | `base64-js` | `@scure/base` |
| --------------------- | --------------- | --------- | ------------- | ----------- | ------------- |
| Node.js 25            | TODO            | TODO      | TODO          | TODO        | TODO          |
| Node.js 22            | 1,683,502       | 1,680,672 | 974,659       | 25,445      | 5,126         |
| v8 / Chrome           | 2,702,703       | 26,217    | 26,924        | 27,271      | 2,652,520     |
| v8 (old)              | 78,759          | 26,217    | 26,924        | 27,271      | 4,274         |
| Chrome (old)          | 202,511         | 24,497    | 24,329        | 25,202      | 4,283         |
| JSC / Safari          | 1,782,531       | 14,863    | 14,758        | 14,975      | 1,919,386     |
| JSC (old)             | 111,321         | 14,863    | 14,758        | 14,975      | 7,641         |
| Safari (old)          | 221,828         | 17,797    | 17,834        | 18,024      | 7,150         |
| SM / Firefox          | 97,116          | 27,258    | 26,613        | 28,839      | 95,584        |
| SM (old)              | 77,574          | 27,258    | 26,613        | 28,839      | 8,774         |
| Firefox (old)         | 184,672         | 26,310    | 25,332        | 27,974      | 7,974         |
| Hermes / React Native | 5032            | 2004      | 2011          | 2040        | 359           |

## fromHex

Notes:

1.  `Buffer` does not perform proper validation
2.  Firefox seems to be slow in native `fromHex`, hopefully should be fixed upstream. Not catastrophic though

| Engine                | `@exodus/bytes` | `Buffer` | `@scure/base` |
| --------------------- | --------------- | -------- | ------------- |
| Node.js 25            | TODO            | TODO     | TODO          |
| Node.js 22            | 70,862          | 272,926  | 4,037         |
| v8 / Chrome           | 703,730         | 8,667    | 681,663       |
| v8 (old)              | 66,503          | 7,611    | 3,926         |
| Chrome (old)          | 49,356          | 8,667    | 3,907         |
| JSC / Safari          | 1,412,429       | 6,551    | 1,366,120     |
| JSC (old)             | 78,703          | 6,542    | 7,889         |
| Safari (old)          | 86,430          | 6,551    | 6,306         |
| SM / Firefox          | 29,495 (note 2) | 12,201   | 28,898        |
| SM (old)              | 41,729          | 12,201   | 3,865         |
| Firefox (old)         | 83,886          | 13,144   | 3,843         |
| Hermes / React Native | 2944            | 1762     | 280           |

## toHex

Notes:

1.  `Buffer.from` is separate because it is common to see `Buffer.from(uint8).toString(...`, despite that being a copy
2.  Firefox seems to be slow in native `toHex`, hopefully should be fixed upstream. Not catastrophic though

| Engine                | `@exodus/bytes` | `Buffer` | `Buffer.from` | `@scure/base` |
| --------------------- | --------------- | -------- | ------------- | ------------- |
| Node.js 25            | TODO            | TODO     | TODO          | TODO          |
| Node.js 22            | 398,406         | 396,040  | 380,807       | 3,762         |
| v8 / Chrome           | 611,995         | 74,599   | 71,480        | 607,903       |
| v8 / Chrome (old)     | 80,045          | 74,074   | 72,025        | 3,624         |
| JSC / Safari          | 1,420,455       | 63,363   | 61,372        | 1,414,427     |
| JSC / Safari (old)    | 68,866          | 62,937   | 60,968        | 7,172         |
| SM / Firefox          | 53,135 (note 2) | 71,378   | 66,326        | 51,188        |
| SM / Firefox (old)    | 80,775          | 71,669   | 66,644        | 6,683         |
| Hermes / React Native | 5107            | 4529     | 4550          | 299           |
