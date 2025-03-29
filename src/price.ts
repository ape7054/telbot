import Decimal from "decimal.js";
import path from 'path';
const fs = require('fs');
interface Item {
    mint: string;
    router: number;
    price: number;
    unit:number; //0 WSOL 1 USDC 2 USDT 
}
import { RouterInfo } from "./config";

const wsolstr = "So11111111111111111111111111111111111111112";
const usdcstr = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export class PriceOptimizer {
    private dataArray: Item[];
    private mintMap: Map<string, { min: Item; max: Item }>;
    private indexMap: Map<string, number>;
    private mintArray: string[];
    private tokensDir: string;
  
    constructor() {
      this.dataArray = [];
      this.mintMap = new Map();
      this.indexMap = new Map();
      this.mintArray = [];
      this.saveTokenJson();
      this.tokensDir = path.join(__dirname, '../'); // 使用相对路径
    }

    processItem(routerInfo:RouterInfo): boolean {
        var newItem:Item = {router:routerInfo.id,mint:"",price:0,unit:-1};
        if(routerInfo.input == wsolstr){ 
            newItem.unit = 0;                  // [wsolstr,token]
            newItem.mint = routerInfo.output;
            newItem.price = new Decimal(routerInfo.in).div(new Decimal(routerInfo.out)).toNumber()
            if(routerInfo.output == usdcstr){  // [wsolstr,usdcstr] => [usdcstr,wsolstr]
                newItem.unit = 1;
                newItem.mint = routerInfo.input;
                newItem.price = new Decimal(routerInfo.out).div(new Decimal(routerInfo.in)).toNumber()
            }
        }else if(routerInfo.input == usdcstr){  
            newItem.unit = 1;                   // [usdcstr,token]
            newItem.mint = routerInfo.output;   // [usdcstr,wsolstr]         
            newItem.price = new Decimal(routerInfo.in).div(new Decimal(routerInfo.out)).toNumber()   
        }else if(routerInfo.output == wsolstr){ // 这里已经排除了 input = USDC
            newItem.unit = 0;
            newItem.mint = routerInfo.input;
            newItem.price = new Decimal(routerInfo.out).div(new Decimal(routerInfo.in)).toNumber()
        }else if(routerInfo.output == usdcstr){ // 这里已经排除了 input = WSOL
            newItem.unit = 1;
            newItem.mint = routerInfo.input;
            newItem.price = new Decimal(routerInfo.out).div(new Decimal(routerInfo.in)).toNumber()
        }else{
            return false;
        }
        if (newItem.price === Infinity) return false; //价格异常 Infinity
        if(newItem.unit==0 && (routerInfo.input !='So11111111111111111111111111111111111111112' && routerInfo.output !='So11111111111111111111111111111111111111112')) console.log(routerInfo,newItem);
        const mint = newItem.mint;
        const unit = newItem.unit;
        const current = this.mintMap.get(mint+unit);
        if (!current) {
            this.mintMap.set(mint+unit, { min: newItem, max: newItem });
            this._addToArray(newItem);
        } else {
            let newMin = current.min;
            let newMax = current.max;
            let updated = false;

            if(newItem.price<newMin.price){
                // console.log(newItem.router,newItem.price,"更小");
                // console.log(newMin.router,newMin.price,'小');
                // console.log(newMax.router,newMax.price,"大");
                if(newItem.router == newMax.router){
                    // console.log('小=>大','新增小');
                    this._removeFromArray(current.max); //去掉老的最大
                    newMin = newItem;
                    newMax = newMin;
                }else{
                    // console.log('小=>更新');
                    this._removeFromArray(current.min); //去掉老的更小
                    newMin = newItem;
                }
                updated = true;
            }else{
                if(newItem.price<newMax.price){
                    if(newItem.router==newMin.router){
                        // console.log(newMin.router,newMin.price,'小');
                        // console.log(newItem.router,newItem.price,"中");
                        // console.log(newMax.router,newMax.price,'大');
                        // console.log('最低价格要提高');
                        this._removeFromArray(current.min);
                        newMin = newItem;
                        updated = true;
                    }else if(newItem.router==newMax.router){
                        // console.log(newMin.router,newMin.price,'小');
                        // console.log(newItem.router,newItem.price,"中");
                        // console.log(newMax.router,newMax.price,'大');
                        // console.log('最高价格要降低');
                        this._removeFromArray(current.max);
                        newMax = newItem;
                        updated = true;
                    }
                }else{
                    // console.log(newMin.router,newMin.price,'小');
                    // console.log(newMax.router,newMax.price,'大');
                    // console.log(newItem.router,newItem.price,"更大");
                    if(newItem.router == newMin.router){
                        // console.log('大=>小','新增大');
                        this._removeFromArray(current.min); //去掉老的最小
                        newMin = newMax;                    //老的最大变成最小
                        newMax = newItem;                   //新的变成最大
                    }else{
                        // console.log('大=>更新');
                        this._removeFromArray(current.max);
                        newMax = newItem;
                    }
                    updated = true;
                }
            }
            
            if (updated) {
                this._addToArray(newItem);
                this.mintMap.set(mint+unit, { min: newMin, max: newMax });
                const wsolCurrent = this.mintMap.get(mint+"0");
                const usecCurrent = this.mintMap.get(mint+"1");
                const data:any = {
                    status: true,
                    mint: mint,
                    wsol:{status:false},
                    usdc:{status:false}
                }
                if(wsolCurrent){
                    data.wsol = {
                        status: true,
                        min: {
                            router: current.min.router,
                            price: current.min.price
                        },
                        max: {
                            router: current.max.router,
                            price: current.max.price
                        }
                    }
                }
                if(usecCurrent){
                    data.wsol = {
                        status: true,
                        min: {
                            router: current.min.router,
                            price: current.min.price
                        },
                        max: {
                            router: current.max.router,
                            price: current.max.price
                        }
                    }
                }
                fs.writeFileSync(path.join(this.tokensDir, `tokens/${mint}.json`), JSON.stringify(data, null, 2));
                if(this.mintArray.indexOf(mint) == -1){
                    this.mintArray.push(mint);
                }
            }
        }
        return true;
    }

    saveTokenJson() {
        setInterval(() => {
            var jsonData: string[] = this.mintArray;
            fs.writeFileSync(path.join(this.tokensDir, 'tokens.json'), JSON.stringify(jsonData, null, 2));
        }, 1000); // 1000毫秒 = 1秒
    }
  
    private _addToArray(item: Item): void {
      this.dataArray.push(item);
      const key = `${item.mint}-${item.router}`;
      this.indexMap.set(key, this.dataArray.length - 1);
    }
  
    private _removeFromArray(item: Item): void {
      const key = `${item.mint}-${item.router}`;
      const index = this.indexMap.get(key);
  
      if (index !== undefined) {
        this.dataArray.splice(index, 1);
        this.indexMap.delete(key);
  
        for (let i = index; i < this.dataArray.length; i++) {
          const currentItem = this.dataArray[i];
          const currentKey = `${currentItem.mint}-${currentItem.router}`;
          this.indexMap.set(currentKey, i);
        }
      }
    }

    getData(): Item[] {
        return this.dataArray;
    }
}

// // 使用示例
const optimizer = new PriceOptimizer();
// optimizer.processItem({
//     id:2,
//     in:"20",
//     input:"usdcstr",
//     out:"1",
//     output:wsolstr,
//     amm:"", name:"", poola:"", poolb:""
// });
console.log(optimizer.getData());