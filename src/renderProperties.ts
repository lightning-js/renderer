export const renderProperties = [
    'memBlockIndex',
    'boltId', // id of the boltComponent (which has multiple elements)
    'parentBoltId', // id of the parent boltComponent (do we need it?)
    'elementId', // previously boltId
    'parentId', // elementId of the parent element
    'w',
    'h',
    'x',
    'y',
    'z',
    'color',
    'alpha',
    'parentAlpha', // ff over na denken
    'rotation',
    'pivotX',
    'pivotY',
    'scaleX',
    'scaleY',
    'mountX',
    'mountY',
    'visible',
    'zIndex',
    'clippingX',
    'clippingY',
    'clippingW',
    'clippingH',
    'renderToTexture',
    'shaderId',
    // 'imageSource'
]

const notMutable = ['memBlockIndex', 'boltId', 'elementId']

export const mutableRenderProperties = renderProperties.filter(prop => notMutable.indexOf(prop) === -1)

console.log(mutableRenderProperties)