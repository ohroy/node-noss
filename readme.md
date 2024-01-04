
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
