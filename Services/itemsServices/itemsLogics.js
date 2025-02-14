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

function loadItemPath(ItemId){
    try{
        const data=loadIndex();

        if(!data[ItemId]) {
            throw new Error(`Item ID ${ItemId} not found in index.`);
        }

        return path.join(__dirname, data[ItemId]); 
    }catch(err){
        throw err;
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
        indexData[itemId]=`data/${canteenId}.json`;
        saveIndex(indexData);

    }catch(err){
        throw err;
    }
}


function loadCanteenItems(canteen=null,fileDir=null) {
    try {
        const filePath = fileDir?path.join(__dirname,fileDir):path.join(__dirname, `data/${canteen}.json`);
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
        let data=await loadCanteenItems(canteenId);

        if (!data.item || !data.item[ItemId]) {
            throw new Error(`Item ID ${ItemId} not found in cantcanteenIdeen ${canteenId}`);
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

function updateData(canteenId,ItemId,image,newData){
    try{
        let data=loadCanteenItems(canteenId);

        if (!data.item||!data.item[ItemId]) {
            throw new Error(`Item ID ${ItemId} not found in canteen ${canteenId}`);
        }

        const oldImagePath=data.item[ItemId].ImagePath;

        Object.assign(data.item[ItemId], newData);

        if(image){
            const newImagePath=`public/images/${ItemId}`;

            if (oldImagePath && fs.existsSync(`pubic/${oldImagePath}`)) {
                fs.unlinkSync(`pubic/${oldImagePath}`);
            }

            image.mv(newImagePath);

            data.item[ItemId].ImagePath=newImagePath;
        }

        fs.writeFileSync(path.join(__dirname, `data/${canteenId}.json`), JSON.stringify(data, null, 4));
    }catch(err){
        throw err;
    }
}

async function loadItemById(ItemId){
    try{
        const filePath=await loadItemPath(ItemId);
        const data=await loadCanteenItems(null,filePath);

        if(!data.item[ItemId]){
            return null;
        }

        data.item[ItemId].canteenId=data.canteenId;

        return data.item[ItemId];

    }catch(err){
        throw err;
    }
}

async function loadCanteenDataById(canteenId) {
    try{
        const data=await loadCanteenItems(canteenId);

        const {CanteenName,Location,fromTime,ToTime,accessTo}=data;

        return {CanteenName,Location,fromTime,ToTime,accessTo};
    }catch(err){
        throw err;
    }
}

module.exports={
    loadCanteenItems,
    generateIdForItem,
    saveCanteenData,
    deleteItemWithItemId,
    updateData,
    loadItemById,
    loadCanteenDataById,
}