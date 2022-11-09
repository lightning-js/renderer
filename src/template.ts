import { norm } from "./core/lib/utils.js";
export const mainView = (thx) => {

    let i = 0;
    let memId = 1;
    let nodeId = 1;
    let elementId = 0;

    const vw = 1920;
    const vh = 1080;

    const background = {
        memId: 1, nodeId: 1, 
        elementId:1, parentId: 0,
        w: vw - 200, h: vh - 200,
        x: 100, y: 100,
        color: 0x222596be,
        alpha: 1
    }    
    const menu = {
        memId: 2, nodeId: 2,
        elementId: 2, parentId: background.elementId,
        w: 200, h: 800,
        x: 50, y: 50,
        color: 0xffeab676,
        alpha: 1
    }

    const menuItem = {
        memId: 3, nodeId: nodeId++,
        elementId: 3, parentId: menu.elementId,
        w: 180, h: 80,
        x: 10, y: 20,
        color: 0xffffffff,
        alpha: 1
    }

    const menuItem1 = {
        memId: 3, nodeId: nodeId++,
        elementId: 4, parentId: menu.elementId,
        w: 180, h: 80,
        x: 10, y: 120,
        color: 0xffffffff,
        alpha: 1
    } 

    thx.send(
        'bolt', [background, menu]
    );

    thx.send(
        'bolt', menuItem
    ); 

    thx.send(
        'bolt', menuItem1
    ); 
}