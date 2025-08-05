const mongoose=require("mongoose");
const passportlocalmongoose=require("passport-local-mongoose");

const userschema= new mongoose.Schema({
    email:{
        type:String,
        require:true
    }
});

userschema.plugin(passportlocalmongoose);
module.exports=mongoose.model("User",userschema); 


