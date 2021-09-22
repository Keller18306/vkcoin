export type Group = {
    id: number,
    name: string,
    screen_name: string,
    is_closed: 0 | 1,
    type: 'group' | 'page',
    photo_200: string
}

export type Top = {
    userTop: {
        id: number,
        score: number,
        first_name: string,
        last_name: string,
        can_access_closed: boolean,
        is_closed: boolean,
        photo_200: string,
        link: string
    }[],
    groupTop: {
        id: number,
        score: number,
        name: string,
        screen_name: string,
        is_closed: boolean,
        type: 'page' | 'group',
        photo_200: string,
        link: string
    }[],
    online: number,
    txSum: number[],
    total: number[],
    groupInfo: null | any /*tempory any type*/
}

export type InitType = {
    type: 'INIT',
    score: number,
    place: number,
    randomId: number,
    pow: string/*"530-220*786+window.Math.round(680/2)*2-((typeof window.parseInt !== 'undefined') ? 1 : 5)+(window.WebSocket ? 1 : 2)+902"*/,
    items: [],
    tx: number[],
    top: Top,
    tick: number,
    vkpay: boolean,
    ccp: number,
    firstTime: boolean,
    ttl: number,
    digits: {
        description: string,
        value: number,
        trend: number
    }[],
    hasGift: boolean,
    botList: {
        id: number,
        name: string,
        description: string,
        image: string,
        url: string,
        flag: number,
        percent: number,
        order: number
    }[]
}