const express = require('express')
const wordRoutes = require('./word.routes')
const userRoutes = require('./user.routes')

const router = express.Router()

router.get('/', (req, res) => {
  res.json({
    message: 'API rodando 🚀'
  })
})

router.use(userRoutes)
router.use(wordRoutes)

module.exports = router