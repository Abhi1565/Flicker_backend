import mongoose from "mongoose";

const messageModel = new mongoose.Schema({
    senderId:{
       type:mongoose.Schema.Types.ObjectId,
       ref:"User",
       required:true  
    },
    receiverId:{
       type:mongoose.Schema.Types.ObjectId,
       ref:"User",
       required:true  
    },
    message:{
       type:String,
       required:true 
    },
    deletedForMe: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        deletedAt: {
            type: Date,
            default: Date.now
        }
    }],
    deletedForEveryone: {
        type: Boolean,
        default: false
    },
    deletedForEveryoneAt: {
        type: Date,
        default: null
    }
}, {timestamps:true});

export const Message = mongoose.model("Message",messageModel);