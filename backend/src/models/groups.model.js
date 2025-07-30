import mongoose,{Schema} from 'mongoose';

const groupSchema = new Schema({
    name:{
        type: String,
        required: true
    },

    owner:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    members:[
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    ],

    admins:[
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    ]

},{timestamps: true});

export const Group = mongoose.model('Group', groupSchema);
