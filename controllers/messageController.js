import { Conversation } from "../models/conversationModel.js"
import { Message } from "../models/messageModel.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

export const sendMessage = async(req,res) => {
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const {message} = req.body;

        let gotConversation = await Conversation.findOne({
            participants:{$all : [senderId, receiverId]},
        });

        if(!gotConversation){
            gotConversation = await Conversation.create({
                participants:[senderId, receiverId]
            })
        };
        let newMessage = await Message.create({
            senderId,
            receiverId,
            message
        });
        if(newMessage){
            gotConversation.messages.push(newMessage._id);
        };

        await Promise.all([gotConversation.save(), newMessage.save()]);

        // Populate sender and receiver fields for socket emission and response
        newMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'fullName username profilePhoto')
            .populate('receiverId', 'fullName username profilePhoto');

        // SOCKET IO
        const receiverSocketId  = getReceiverSocketId(receiverId);       
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }
        return res.status(201).json({
            newMessage
        })
    }
    catch(error){
        console.log(error);
    }    
}

export const getMessage = async (req,res) => {
    try {
        const receiverId = req.params.id;
        const senderId = req.id;
        const conversation = await Conversation.findOne({
            participants:{$all : [senderId, receiverId]}
        }).populate("messages"); 
        
        // Filter out messages based on current user's view
        const filteredMessages = conversation?.messages?.filter(message => {
            // Don't show messages deleted for everyone
            if (message.deletedForEveryone) {
                return false;
            }
            
            // Don't show messages deleted for current user
            const isDeletedForMe = message.deletedForMe?.some(deletion => 
                deletion.userId.toString() === senderId
            );
            
            return !isDeletedForMe;
        }) || [];
        
        return res.status(200).json(filteredMessages);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteForMe = async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const userId = req.id;

        const message = await Message.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Check if user is part of the conversation (either sender or receiver)
        if (message.senderId.toString() !== userId && message.receiverId.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to delete this message" });
        }

        // Add user to deletedForMe array if not already there
        const alreadyDeleted = message.deletedForMe.some(deletion => deletion.userId.toString() === userId);
        
        if (!alreadyDeleted) {
            message.deletedForMe.push({
                userId: userId,
                deletedAt: new Date()
            });
            await message.save();
        }

        return res.status(200).json({ 
            message: "Message deleted for you",
            deletedMessage: message
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export const deleteForEveryone = async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const userId = req.id;

        const message = await Message.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Only the original sender can delete for everyone
        if (message.senderId.toString() !== userId) {
            return res.status(403).json({ message: "Only the sender can delete this message for everyone" });
        }

        // Check if message is not already deleted for everyone
        if (message.deletedForEveryone) {
            return res.status(400).json({ message: "Message already deleted for everyone" });
        }

        // Mark message as deleted for everyone
        message.deletedForEveryone = true;
        message.deletedForEveryoneAt = new Date();
        message.message = "This message was deleted";
        await message.save();

        // Emit socket event to notify other user
        const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageDeletedForEveryone", message);
        }

        return res.status(200).json({ 
            message: "Message deleted for everyone",
            deletedMessage: message
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}