const { buildSchema, graphql  } = require('graphql')
const express = require('express')
const bodyParser = require('body-parser')
const { graphqlHTTP } = require('express-graphql')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Event = require('./models/event')
const User = require('./models/user')

const app = express()
app.use(bodyParser.json())
app.use('/graphql', graphqlHTTP({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!

        }
        type User {
            _id: ID!
            email: String
            password: String
        }
        input UserInput {
            email: String!
            password: String!
        }
        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }
        type RootQuery {
            events: [Event!]!
        }
        type RootMutaion {
            createEvent(eventInput:EventInput): Event
            createUser(userInput:UserInput): User
        }
        schema {
            query: RootQuery
            mutation: RootMutaion
        }
    `),
    rootValue: {
        events: () => Event.find().then(result=>{
            return result.map(res=>{
                return {...res._doc, _id: res._doc._id.toString()}
            })
        }),
        hello: () => 'hello',
        createEvent: (args) => {
            let createEvent
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price,
                date: new Date(args.eventInput.date),
                creator: '603bb2cff0cc9030922525a7'
            })
            return event.save().then(result=>{
                createEvent =  {...result._doc, _id: result._doc._id.toString()}
                return User.findById('603bb2cff0cc9030922525a7')

            }).then(user=>{
                if(!user){
                    throw new Error('User not found!') 
                }
                user.createEvents.push(event)
                return user.save()
            }).then(res=>createEvent).catch(e=>console.log(e))
        },
        createUser: (args) => {
            return User.findOne({email: args.userInput.email}).then(user => {
                if(user){
                    throw new Error('User exists already!') 
                }
                return bcrypt.hash(args.userInput.password, 12)
                
            }).then(hashedPassword=>{
                const user = new User({
                    email: args.userInput.email,
                    password: hashedPassword,
                })
                return user.save()
            }).then(result=>{
                return {...result._doc, _id: result.id, password: null}
            }).catch(e=>{
                throw e
            })
           
        }
    },
    graphiql: true,
}))
mongoose.connect(process.env.MONGO_URL).then(()=>{
    app.listen(3000)
    console.log('server is running ' + 3000)
}).catch(e=>console.log(e))

