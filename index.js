require('dotenv').config()

const { request } = require('express')
const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')
const Persons = require('./models/person.js')
const { ValidationError } = require('mongoose').Error;


app.use(cors())
morgan.token('body', (request) => JSON.stringify(request.body))
app.use(express.json())
app.use(morgan('tiny'))
app.use(express.static('build'))



app.get('/api/persons',(request, response) => {
    Persons.find({}).then(person => {
    response.json(person)
  })
})

app.get('/info', (request, response) => {
  Persons.find({}).countDocuments()
    .then(count => {
      const date = new Date()
      response.send(
        `<p>Phonebook has info for ${count} persons</p>
         <br>
         <p>${date}</p>`
      )
    })
    .catch(error => next(error));
})

app.get('/api/persons/:id', (request, response, next) => {
    Persons
      .findById(request.params.id)
      .then(person => {
        if (person) {
          response.json(person)
        } else {
          response.status(404).end()
        }
      })
      .catch(error =>   next(error)   )
})

app.delete('/api/persons/:id', (request, response, next) => {
    Persons.findByIdAndRemove(request.params.id)
      .then(result => {
      response.status(204).end()
      })
      .catch(error => next(error))
})

const postMorgan = morgan(':method :url :status :res[content-length] - :response-time ms :body')

app.post('/api/persons', postMorgan, (request, response, next) => {
  const body = request.body;

  if (!body.name || !body.number) {
    return response.status(400).json({
      error: 'name or number missing'
    });
  } else {
    const person = new Persons({
      name: body.name,
      number: body.number,
    });

    person
      .save()
      .then(person => {
        response.json(person);
      })
      .catch(error => {
        if (error instanceof ValidationError) {
          // If it's a validation error, handle it here
          response.status(400).json({ error: error.message });
        } else {
          // If it's some other error, pass it to the error middleware
          next(error);
        }
      });
  }
});

app.put('/api/persons/:id', (request, response, next) => {
  const {name, number} = request.body


  Persons.findByIdAndUpdate(
      request.params.id, 
      { name, number }, 
      { new: true, runValidators: true, context: 'query' }
  )
      .then(updatedPerson => {
        response.json(updatedPerson)
      })
      .catch(error => next(error))
})

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

// handler of requests with unknown endpoint
app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })

  next(error)
  }}

// this has to be the last loaded middleware.
app.use(errorHandler)

const Port = process.env.PORT
app.listen(Port, () =>
  console.log(`Server running on http://localhost:${Port}`)
);

