import threadx from "../../threadx/build/index.js"
console.log("??")
threadx.register('animation', [{
    name: 'progress',
    array: 'int32',
    length: 2e4,
    mapping: [
        'boltId', 'property', 'value', 'event'
    ]
}]).then(() => {
    console.log('animation buffer ready')
})

threadx.send('animation.progress', { boltId: 1, property: 2, value: 3, event: 4 })