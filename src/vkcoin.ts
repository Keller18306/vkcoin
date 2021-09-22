import { VKCoinAPI } from "./api";
import { MethodSendResponse } from "./api/types";
import { getIframeUrl } from "./getIframeUrl";
import { getUserId } from "./getUserId";
import { VKCoinQueuer } from "./queuer";
import { VKCoinWebSocket } from "./ws";

export class VKCoin {
    public access_token: string;

    public key: string | undefined;
    public userId: number | undefined;

    public ws: VKCoinWebSocket;
    public api: VKCoinAPI;

    public queuer: VKCoinQueuer;

    /**
     * @description Данный VKCoin API используется для автоматической авторизации в VKCoin.
     * Вам необходимо всего лишь указать access_token от аккаунта ВКонтакте, а далее код
     * сам получит необходимые данные. Такие как айди текущего пользователя и ключ от вк коина.
     * @param access_token Токен от аккаунта ВКонтакте
     */
    constructor (access_token: string) {
        if(!access_token) throw new Error('access_token is required')
        this.access_token = access_token

        this.ws = new VKCoinWebSocket()
        this.api = new VKCoinAPI({ userId: 1, key: '.' })

        this.queuer = new VKCoinQueuer()
    }

    /**
     * @description Запускает процесс авторизации ВКонтакте и VKCoin, а также подключения к VKCoin
     * @returns Экземпляр текущего класса
     */
    async start() {
        const [id, url] = await Promise.all([
            getUserId(this.access_token),
            getIframeUrl(this.access_token)
        ])

        if(typeof id != 'number') throw new Error('can not get userId by access_token')
        if(typeof url != 'string' || url == '') throw new Error('can not get iframeUrl by access_token')

        await this.ws.start(url)

        const key = await this.ws.getMerchantKey()

        if(typeof key != 'string') throw new Error('can not get key by access_token')

        this.api = new VKCoinAPI({userId: id, key: key})

        this.key = key
        this.userId = id

        this.queuer.addWorker((toId: number, amount: number, fromShop: boolean) => {
            return this.ws.transfer(toId, amount, fromShop)
        }, 3000)

        this.queuer.addWorker((toId: number, amount: number, fromShop: boolean) => {
            return this.api.sendCoins(toId, amount, fromShop)
        })

        return this
    }

    /**
     * @description Отправляет коины другому пользователю
     * Отличается от this.ws.transfer() и от this.api.sendCoins() тем, что
     * в отличии от указанных имеет очередь. Если быстро выполнять те методы, то
     * мы можем столкнуться с ошибкой ANOTHER_TRANSACTION_IN_PROGRESS_AT_SAME_TIME.
     * Также WebSocket имеют каждый свой лимит по времени в 3 секунды.
     * Получается очередь соблюдает всё условия, чтобы как можно быстрее выполнить
     * все транзакции, в заданной последовательности и без ошибок.
     * @param toId Айди пользователя
     * @param amount Сумма, которую следует отправить (целое число)
     * @param fromShop Отправить от имени магазина?
     * @param noQueue Поместить самым первым в очереди
     * @returns Объект с информацией о транзакции
     */
    async transfer(toId: number, amount: number, fromShop: boolean = false, noQueue: boolean = false): Promise<MethodSendResponse> {
        return this.queuer.addTask(toId, amount, fromShop, noQueue)
    }
}