type Worker = {
    getIndex: () => number
    busy: boolean
    func: Function
    delay: number | null
}

type Task = { toId: number, amount: number, fromShop: boolean, success: (any: any) => void, error: () => void }

export class VKCoinQueuer {
    private queue: Task[] = []

    private workers: Worker[] = []

    addWorker(func: (toId: number, amount: number, fromShop: boolean) => any, delay: number | null = null) {
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

    addTask(toId: number, amount: number, fromShop: boolean, noQueue: boolean = false) {
        const promise = new Promise<any>((resolve, reject) => {
            const task: Task = { toId, amount, fromShop, success: resolve, error: reject }

            if(noQueue) this.queue.unshift(task)
            this.queue.push(task)
        })

        setImmediate(this.checkTasks)

        return promise
    }

    private async checkTasks(): Promise<void> {
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
        
        await selectedWorker.func(task.toId, task.amount, task.fromShop).then(task.success, task.error)

        if(selectedWorker.delay) await new Promise(res => setTimeout(res, selectedWorker!.delay!))

        selectedWorker.busy = false

        setImmediate(this.checkTasks)
    }
}