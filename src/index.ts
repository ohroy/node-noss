import * as bip39 from 'bip39'
import {type Event, nip13} from 'nostr-tools'
import {initNostrWasm} from 'nostr-wasm-ng'
import Web3 from 'web3'
import Ws from 'ws'
import winston from 'winston'
import {sleep} from "./util.js";
import {startWorkers} from "./worker.js";
import 'dotenv/config'

const myFormat = winston.format.printf((rr) => {
    const {level, message, label, ms} = rr;
    // console.log(rr)
    return `[${ms} ${level}]: ${message}`;
});


const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        // winston.format.simple(),
        winston.format.splat(),
        winston.format.colorize(),
        winston.format.ms(),
        myFormat,
    ),
    // defaultMeta: {service: 'noss'},
    transports: [
        //
        // - Write all logs with importance level of `error` or less to `error.log`
        // - Write all logs with importance level of `info` or less to `combined.log`
        //
        // new winston.transports.File({ filename: 'error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'combined.log' }),

        new winston.transports.Console()
    ],
});

async function main() {
    // const a = 'affair short gallery tone much fish error anger clarify strike violin brown'
    // //
    // if (!bip39.validateMnemonic(a)) {
    //     throw new Error('Key Error')
    // }

    logger.info('started !')
    const {generateSecretKey, getPublicKey, verifyEvent, finalizeEvent} = await initNostrWasm();
    let lastEventId = undefined;
    const ws = new Ws('wss://report-worker-2.noscription.org/')
    ws.onopen = () => {
        // ws.send('Message From Client')
        logger.info('ws connected')
    }
    ws.onerror = (error) => {
        console.log(`WebSocket error: ${error.message}`)
    }

    ws.onmessage = (e) => {
        const {eventId, seqWitness: s} = JSON.parse(e.data as string)
        lastEventId = eventId;
        // console.log('newest event id:' + lastEventId)
    }
    const privateKey = Buffer.from(process.env.PRIVATE_KEY as string, 'hex')
    const publicKeyStr = process.env.PUBLIC_KEY as string;

    // 获取最新的区块.
    let startTime = Date.now()
    let blockNum = BigInt(0);
    const endpoints = ["https://rpc.ankr.com/arbitrum", "https://arbitrum.blockpi.network/v1/rpc/public", "https://arb1.arbitrum.io/rpc", "https://1rpc.io/arb", "https://arbitrum.llamarpc.com", "https://arb-pokt.nodies.app", "https://arbitrum-one.public.blastapi.io", "https://arb-mainnet-public.unifra.io", "https://arbitrum.api.onfinality.io/public", "https://arbitrum-one.publicnode.com", "https://arbitrum.meowrpc.com", "https://arbitrum.drpc.org"]
    let tagSeqWitness: string[] = []
    while (true) {
        try {
            if (!lastEventId) {
                await sleep(500)
                continue;
            }
            const web3 = new Web3(endpoints[Math.floor(Math.random() * endpoints.length)]);
            if (blockNum === BigInt(0) || Date.now() - startTime > 1000 * 60) {
                blockNum = await web3.eth.getBlockNumber();
                startTime = Date.now();
            }
            const newBlockNumber = Number(blockNum) + Math.floor((Date.now() - startTime) / 1e3 * 4)
            // 此后呢，我们自动累加区块，然后获取区块详情.
            const block = await web3.eth.getBlock(newBlockNumber)
            if (block) {
                // const timepassed = BigInt(Math.floor(Date.now() / 1000)) - block.timestamp
                // 成功找到区块.
                tagSeqWitness = ["seq_witness", newBlockNumber.toString(), block.hash!]
                // 更新见证者成功.
            } else {
                // 寻找区块失败.
                logger.error('寻找区块失败.')
                await sleep(1000)
                continue;
            }

            const event: any = {
                "kind": 1,
                // "created_at": 1704363094,
                "tags": [["p", "9be107b0d7218c67b4954ee3e6bd9e4dba06ef937a93f684e42f730a0c3d053c"],
                    ["e", "51ed7939a984edee863bfbb2e66fdc80436b000a8ddca442d83e6a2bf1636a95", "wss://relay.noscription.org/", "root"],
                    ["e", lastEventId, "wss://relay.noscription.org/", "reply"],
                    tagSeqWitness,
                ],
                // ["nonce", "0ypzk4h9uu3", "21"]],
                "content": "{\"p\":\"nrc-20\",\"op\":\"mint\",\"tick\":\"noss\",\"amt\":\"10\"}",
                "pubkey": publicKeyStr
            }
            logger.log('info', '获取区块完成,开始求解...hash:%s,block:%s', block.hash, block.number)
            const timer1 = Date.now();
            const eventWithNip13 = await startWorkers(
                event,
                21,
                privateKey
            ) as Event
            logger.log('info', '计算hash完成，用时%s ms', Date.now() - timer1)
            // 由于刚算完 event_id， 这里没必要再重新计算，跳过hash，优化速度
            finalizeEvent(eventWithNip13, privateKey, undefined, true)
            // console.log(eventWithNip13)
            // verifyEvent(eventWithNip13)
            // post
            logger.info('求解成功...,准备提交')
            const result = await fetch("https://api-worker.noscription.org/inscribe/postEvent", {
                "headers": {
                    "accept": "application/json, text/plain, */*",
                    "accept-language": "zh-CN,zh;q=0.9",
                    "content-type": "application/json",
                    "sec-ch-ua": "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                    // "x-gorgon": "16327071665c8d11dbbf1d09537273c029c5d0e144d4c554bf49eb22dd2d0bfe",
                    "Referer": "https://noscription.org/",
                    "Referrer-Policy": "strict-origin-when-cross-origin"
                },
                "body": JSON.stringify(eventWithNip13),
                "method": "POST"
            });
            console.log(await result.json())
        } catch (e) {
            logger.error('胜败乃兵家常事:' + e)
        }
    }
    // 最终事件也是ok的.
    // console.log(verifyEvent(finalEvent))
}

main()
