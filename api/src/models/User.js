// Utilizador: comprador (particular ou restaurante), produtor ou administrador
const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const PAPEIS = ['comprador', 'produtor', 'admin'];

const localizacaoSchema = new Schema({
  lat: { type: Number, min: -90, max: 90 },
  lng: { type: Number, min: -180, max: 180 }
}, { _id: false });

const produtorSchema = new Schema({
  nomeExploracao: { type: String, required: true, trim: true, maxlength: 100 },
  descricao: { type: String, trim: true, maxlength: 1000 },
  localidade: { type: String, required: true, trim: true, maxlength: 100 },
  localizacao: localizacaoSchema,
  validado: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new Schema({
  nome: { type: String, required: true, trim: true, maxlength: 100 },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido']
  },
  passwordHash: { type: String, required: true, select: false },
  papel: { type: String, enum: PAPEIS, default: 'comprador', required: true },

  // Dados específicos do produtor (página pública)
  produtor: {
    type: produtorSchema,
    required() { return this.papel === 'produtor'; }
  }
}, { timestamps: true });

userSchema.statics.PAPEIS = PAPEIS;

// O método só funciona quando passwordHash foi pedido explicitamente com select('+passwordHash').
userSchema.methods.passwordCorresponde = function passwordCorresponde(password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(String(password), this.passwordHash);
};

// Dados que podem ser enviados ao cliente, mesmo quando passwordHash foi selecionado no login.
userSchema.methods.publico = function publico() {
  return {
    _id: this._id,
    nome: this.nome,
    email: this.email,
    papel: this.papel,
    ...(this.papel === 'produtor' ? { produtor: this.produtor } : {}),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = model('User', userSchema);
