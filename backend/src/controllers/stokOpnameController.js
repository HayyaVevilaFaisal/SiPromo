const stokOpnameService = require('../services/stokOpnameService');

async function getAllStokOpname(req, res, next) {
  try {
    const data = await stokOpnameService.getAllStokOpname(req.query.tahunAjaranId);
    res.json(data);
  } catch (error) { next(error); }
}

async function getStokOpnameDetail(req, res, next) {
  try {
    const data = await stokOpnameService.getStokOpnameDetail(req.params.id);
    if (!data) return res.status(404).json({ message: 'Stok opname tidak ditemukan.' });
    res.json(data);
  } catch (error) { next(error); }
}

async function createStokOpname(req, res, next) {
  try {
    const data = await stokOpnameService.createStokOpname(req.body);
    res.status(201).json(data);
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

async function updateStokOpname(req, res, next) {
  try {
    const data = await stokOpnameService.updateStokOpname(req.params.id, req.body);
    res.json(data);
  } catch (error) {
    if ([400, 404, 409].includes(error.status)) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
}

module.exports = { 
    getAllStokOpname, 
    getStokOpnameDetail, 
    createStokOpname,
    updateStokOpname
};