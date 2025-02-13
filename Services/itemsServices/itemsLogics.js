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

function saveCanteenData(data,canteenId){
    try{
        const filePath=path.join(__dirname, `data/${canteenId}.json`);
        fs.writeFileSync(filePath,JSON.stringify(data,null,4));
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
        return null;
    }
}

module.exports={
    loadCanteenItemsWithCanteenId,
    generateIdForItem,
    saveCanteenData,
}