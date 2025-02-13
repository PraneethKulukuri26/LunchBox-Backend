const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, "data/itemsIndex.json");

function loadIndex() {
    try {
        if (!fs.existsSync(indexFile)) {
            throw new Error("Index file not found.");
        }
        const data=fs.readFileSync(indexFile, "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Error loading index file:", err.message);
        throw new Error("Failed to load index file.");
    }
}

function saveIndex(data){
    try{
        fs.writeFileSync(indexFile,JSON.stringify(data,null,4));
    }catch(err){
        throw err;
    }
}

let maxIdCache=null;
let lastLoadedTime=0;
const CACHE_EXPIRY=5*60*1000; 

function generateIdForItem() {
    try {
        const currentTime=Date.now();

        if (maxIdCache!==null && (currentTime-lastLoadedTime)<CACHE_EXPIRY) {
            return ++maxIdCache;
        }

        const indexData=loadIndex();
        const keys=Object.keys(indexData).map(Number);

        maxIdCache=keys.length>0?Math.max(...keys):0;
        lastLoadedTime=currentTime;
        
        return ++maxIdCache;
    } catch (err) {
        throw err;
    }
}

function saveCanteenData(data,canteenId,itemId){
    try{
        const filePath=path.join(__dirname, `data/${canteenId}.json`);
        fs.writeFileSync(filePath,JSON.stringify(data,null,4));

        const indexData=loadIndex();
        indexData[itemId]=path;
        saveIndex(indexData);

    }catch(err){
        throw err;
    }
}


function loadCanteenItemsWithCanteenId(canteen) {
    try {
        const filePath = path.join(__dirname, `data/${canteen}.json`);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error loading canteen data:', err.message);
        throw err;
    }
}

async function deleteItemWithItemId(canteenId,ItemId){
    try{
        let data=await loadCanteenItemsWithCanteenId(canteenId);

        if (!data.item || !data.item[ItemId]) {
            throw new Error(`Item ID ${ItemId} not found in canteen ${canteenId}`);
        }

        delete data.item[ItemId];

        saveCanteenData(data,canteenId);

        let indexData=loadIndex();
        delete indexData[ItemId];

        saveIndex(indexData);
    }catch(err){
        throw err;
    }
}

module.exports={
    loadCanteenItemsWithCanteenId,
    generateIdForItem,
    saveCanteenData,
    deleteItemWithItemId,
}