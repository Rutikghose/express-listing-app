const mongoose=require("mongoose");

    main().then(()=>{
        console.log("database is connect sucessfully");
    })
    .catch((err)=>{
        console.log(err);
    })
    async function main() {
        mongoose.connect(process.env.ATLASDB_URL);
        
    }


    const reviewschema=new mongoose.Schema({
        rating:{
            type:Number,
            min:1,
            max:5
            
        },
        comments:{
            type:String
    }});
    const Review=new mongoose.model("Review",reviewschema);
    module.exports=Review;