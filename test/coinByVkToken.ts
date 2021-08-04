import { VKCoin, WSAPIError } from '../src'
import { RestAPIError } from '../src/api/request'


//https://oauth.vk.com/authorize?client_id=6121396&scope=65536&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1
const coin = new VKCoin('*************************************************************************************')
//debug
eval('global.coin = coin')

coin.start().then(() => {
    console.log('[COIN] Успешно запущен')

    for (let i = 1; i <= 1000; i++) {
        coin.transfer(290331922, 1, false).then((res) => {
            console.log('res', i, res)
        }, (err: WSAPIError | RestAPIError) => {
            console.error('err', i, err)
        })
    }
})

coin.ws.on('transfer', async (data) => {
    console.log('transfer', data)

    const adv = await data.getMore()

    console.log('adv', adv)
})
