import { RestAPIError } from "./api/request"
import { MethodSendResponse } from "./api/types"
import { WSAPIError } from "./ws"

type Worker = {
    getIndex: () => number
    busy: boolean
    func: Function
    delay: number | null
}

type Task = { toId: number, amount: number, fromShop: boolean, success: (response: MethodSendResponse) => void, error: (err: WSAPIError | RestAPIError) => void }

export class VKCoinQueuer {
    private queue: Task[] = []

    private workers: Worker[] = []

    constructor() {
        this.queue = []
        this.workers = []
    }

    addWorker(func: (toId: number, amount: number, fromShop: boolean) => Promise<MethodSendResponse>, delay: number | null = null) {
        const worker: Worker = {
            busy: false,
            func: func,
            delay: delay,
            getIndex: () => {
                for (const i in this.workers) {
                    const inworker = this.workers[i]

                    if (inworker === worker) return +i
                }

                return -1
            }
        }

        this.workers.push(worker)
    }

    addTask(toId: number, amount: number, fromShop: boolean, noQueue: boolean = false): Promise<MethodSendResponse> {
        const promise = new Promise<MethodSendResponse>((resolve, reject) => {
            const task: Task = { toId, amount, fromShop, success: resolve, error: reject }

            if(noQueue) this.queue.unshift(task)
            this.queue.push(task)
        })

        this.checkTasks()

        return promise
    }

    checkTasks(): void {
        setImmediate(() => {
            this.doTasks()
        })
    }

    private async doTasks(): Promise<void> {
        const that = this
        if(this.queue.length == 0) return;

        let selectedWorker: Worker | null = null;

        for(const worker of this.workers) {
            if(worker.busy) continue;

            selectedWorker = worker
            break;
        }
        if(!selectedWorker) return;

        const task = this.queue.shift()
        if(!task) return;

        selectedWorker.busy = true

        if(this.queue.length > 0) this.checkTasks()
        
        await selectedWorker.func(task.toId, task.amount, task.fromShop).then(task.success, task.error)

        if(selectedWorker.delay) await new Promise(res => setTimeout(res, selectedWorker!.delay!))

        selectedWorker.busy = false

        this.checkTasks()
    }
}