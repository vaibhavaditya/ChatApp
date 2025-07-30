import mongoose,{Schema} from 'mongoose';

const messageSchema = new Schema({
    sender:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    receiverUser:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: function(){ return !this.receiverGroup}
    },

    receiverGroup:{
        type: Schema.Types.ObjectId,
        ref: 'Group',
        required: function(){ return !this.receiverUser}
    },

    content:{
        type: String,
        required: true
    }

},{timestamps: true})

export const Message = mongoose.model('Message',messageSchema)