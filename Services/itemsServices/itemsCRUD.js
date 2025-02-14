const itemRepo=require('./itemsLogics');



async function addItem(params,image) {
    //const {canteenId,FoodItemName,Description,Price,AvailableFrom,AvailableTo,Quantity,availability,tags}=params;
    const {ItemName,Description,Price,Quantity,StartingTime,EndingTime,ava,canteenId,tags}=params;

    try{
        
        let loadData=await itemRepo.loadCanteenItems(canteenId);

        const itemId=await itemRepo.generateIdForItem();

        if (!loadData.item) {
            loadData.item = {};
        }

        await image.mv(`public/images/${itemId}`);

        loadData.item[itemId]={
            ItemId:itemId,
            ItemName,
            tags,
            Description,
            Price,
            Quantity,
            StartingTime,
            EndingTime,
            ava,
            ImagePath:`images/${itemId}`
        };

        itemRepo.saveCanteenData(loadData,canteenId,itemId);

    
    }catch(err){
        throw err;
    }
}

async function deleteItem(canteenId,ItemId) {
    try{
        await itemRepo.deleteItemWithItemId(canteenId,ItemId);
    }catch(err){
        throw err;
    }
}

async function updateItem(canteenId,ItemId,image,newData) {

    try{
        await updateItem(canteenId,ItemId,image,newData);
    }catch(err){
        throw err;
    }
    
}

async function getItemId(ItemId) {
    try{
        return await itemRepo.updateData(ItemId);
    }catch(err){
        throw err;
    }
    
}
module.exports={
    addItem,
    deleteItem,
    updateItem,
    getItemId,
}