import threadx from "../../threadx/build/index.js"

threadx.register('animation', [{
    name: 'progress',
    array: 'int32',
    length: 2e4,
    mapping: [
        'elementId', 'property', 'value', 'event'
    ]
}]).then(() => {
    console.log('animation buffer ready')
})

threadx.send('animation.progress', { elementId: 1, property: 2, value: 3, event: 4 })