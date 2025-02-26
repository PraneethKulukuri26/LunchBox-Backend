const itemRepo=require('./itemsLogics');



async function addItem(params,image) {
    //const {canteenId,FoodItemName,Description,Price,AvailableFrom,AvailableTo,Quantity,availability,tags}=params;
    const {ItemName,Description="",Price,Quantity=30,StartingTime="9:00",EndingTime="17:30",ava=true,canteenId,tags=["Veg"]}=params;

    try{
        
        let loadData=await itemRepo.loadCanteenItems(canteenId);

        const itemId=await itemRepo.generateIdForItem();

        if (!loadData.item) {
            loadData.item = {};
        }

        const imageExtension = image.name.split('.').pop();
        await image.mv(`public/images/${itemId}.${imageExtension}`);

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
            ImagePath:`images/${itemId}.${imageExtension}`
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

async function getItemById(ItemId) {
    try{
        return await itemRepo.loadItemById(ItemId);
    }catch(err){
        throw err;
    }
    
}

async function getCanteenDataById(canteenId) {
    try{
        return await itemRepo.loadCanteenDataById(canteenId);
    }catch(err){
        throw err;
    }
}
module.exports={
    addItem,
    deleteItem,
    updateItem,
    getItemById,
    getCanteenDataById,
}