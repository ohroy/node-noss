import {parentPort, Worker, isMainThread, workerData} from "node:worker_threads";
import {type Event, nip13} from 'nostr-tools'
import {initNostrWasm} from 'nostr-wasm-ng'
import {fileURLToPath} from "node:url";

export function getPow(hex: string): number {
    let count = 0

    for (let i = 0; i < hex.length; i++) {
        const nibble = parseInt(hex[i], 16)
        if (nibble === 0) {
            count += 4
        } else {
            count += Math.clz32(nibble) - 28
            break
        }
    }

    return count
}

const cpuIntensiveFunction = async (event: Event, difficulty: number) => {
    const nw = await initNostrWasm()

    const tag = ['nonce', '', difficulty.toString()]

    event.tags.push(tag)

    while (true) {
        const now = Math.floor(new Date().getTime() / 1000)

        if (now !== event.created_at) {
            event.created_at = now
        }

        tag[1] = Math.random().toString(36).substring(2, 15)
        event.id = nw.hashEvent(event);

        // console.log(event.id)
        if (getPow(event.id) >= difficulty) {
            break
        }
    }
    parentPort?.postMessage(event)
    return event
    // 执行占用 CPU 的操作
    // ...

    // 返回结果
};

if (!isMainThread) {
    await cpuIntensiveFunction(workerData[0], workerData[1])
}

export const startWorkers = (data: Event, difficulty: number, prk: Buffer) => new Promise((resolve, reject) => {
    if (isMainThread) {
        // 创建工作线程
        const cpuCount = parseInt(process.env.CPU_COUNT as string)
        const workers = new Array(cpuCount);
        for (let i = 0; i < workers.length; i++) {
            workers[i] = new Worker(fileURLToPath(import.meta.url), {
                // 传递数据
                workerData: [data, difficulty],
                // type: 'module'
            });
        }

        // 监听每个工作线程的完成
        for (const worker of workers) {
            worker.on('message', (result: any) => {
                // 只要有一个线程得到结果，就终止所有的运行
                // console.log('result', result)
                if (result) {
                    for (const worker of workers) {
                        worker.terminate();
                    }
                    resolve(result);
                }
            });
        }
    }
})
