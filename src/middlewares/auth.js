const jwt = require('jsonwebtoken')

function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        error: 'Token não enviado'
      })
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    )

    req.userId = decoded.id

    next()

  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido'
    })
  }
}

module.exports = auth