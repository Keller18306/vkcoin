import { VKCoinAPI } from '../src/'

const api = new VKCoinAPI({
    userId: 290331922,
    key: 'HoG6w-Z#AjK2!Vgb=98uYulk=vo;D*&7eaQ9TO09J0g8TpDy&T'
})

async function start(): Promise<void> {
    await api.getMyBalance().then(console.log)

    await api.getTransactionsFromAccount().then(console.log)

    await api.getTransactionsFromLinks().then(console.log)

    //error test
    await api.setCallback('hi').then(console.log)
}

start()