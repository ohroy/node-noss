
## 这是干嘛的？

懂的都懂。

![/docs/sample.jpg](/docs/sample.jpg)

## 怎么用？

把 `.env.example`改成`.env`，然后里面填上你的私钥和公钥，以及你电脑的cpu个数就可以了。
本项目完全开源，私钥安全自行保证。

```shell
pnpm install
pnpm start
```

## node.js 会不会很慢？
事实上不会，因为关键代码是使用的 `wasm`，是由`c`语言编译而来。

## 原理

**仅供技术交流，普通用户看不懂也没关系**

首先，我的看法是这个noss是非去中心化的，因为它本质上是基于nostr协议，是一个relay server，而relay server并不是去中心化的。
换言之，这个noss本质上就是可以被随意更改的。
它首先会获取eth链上最新的block，然后将这个block的hash作为自己的`seq_witness`，在这里和eth链上关联，但这种关联是单向的。
本质上，它是在模仿一种链，即每个event都要和上一个event关联，以此实现另类的`block chain`。但问题是，目前可能用户（韭菜）们并没有留存这个 event chain的意识，或者说官方并没有提供一个很好的途径来实现它。
目前来看，这些event目前存储在其中心化的服务器上，一旦其服务器崩溃或下线，这些数据自然会灰飞烟灭。

电脑之所以嗡嗡响，并非是该项目骗算力或者挖矿的，本质上是 `nostr`协议的`nip13`提案，[https://github.com/nostr-protocol/nips/blob/master/13.md](https://github.com/nostr-protocol/nips/blob/master/13.md)， 这个`nip13`最初的设计是用来防止发垃圾消息的。(众所周知，nostr最初是用来做区块链社交的)，它用来防止垃圾消息的思路也非常清奇，叫`Pow(Proof of Work)`，简单点来说，就是用算力来证明自己不是一个垃圾信息制造者。。。。
我非常不理解，这有什么用，好吧，可能能给发垃圾信息的人造成更多的电力浪费吧。
这个`nip13`本身十分简单，就是算一下event id的二进制的前面有多少个0，这个算法非常简单，基本上就是进制转换就行。但是，event_id是hash出来的，这个hash比较占用资源，如果要求的0的数量很多，就会导致需要计算很多次 event_id，这个要求0的数量就是`difficulty`， 本例中，其固定为21。
因此，优化这个hash算法，就是提升解题速度的关键，本项目中，使用了wasm的`libsecp256k1`用来进行hash运算。

算出来验证码后(即nonce)，再对event进行最后的sig进行签名，然后就可以发送到 noscription进行 mint了。

至于怎么才算mint成功?这个我也不清楚，不知道是最快的那个，还是从一个block里随机抽取一个。。。

