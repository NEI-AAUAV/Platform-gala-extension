from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user
from app.models.registration import Registration
from pydantic import BaseModel

router = APIRouter()

class InitRegistration(BaseModel):
    nmec: str
    year: int

@router.get("/status")
async def get_registration_status(user: dict = Depends(get_current_user)):
    reg = await Registration.find_one({"user_id": user["id"]})
    if not reg:
        # Return a shell or 404? Front-end expects a shell usually or handles null.
        return None
    return reg

@router.post("/init")
async def initialize_registration(data: InitRegistration, user: dict = Depends(get_current_user)):
    # Check if already exists
    existing = await Registration.find_one({"user_id": user["id"]})
    if existing:
        existing.nmec = data.nmec
        existing.year = data.year
        await existing.save()
        return existing
    
    new_reg = Registration(
        user_id=user["id"],
        nmec=data.nmec,
        year=data.year,
        current_step=1
    )
    await new_reg.save()
    return new_reg

@router.post("/step/{step_number}")
async def update_registration_step(step_number: int, data: dict, user: dict = Depends(get_current_user)):
    reg = await Registration.find_one({"user_id": user["id"]})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not initialized")
    
    # Simple dynamic update based on step
    for key, value in data.items():
        if hasattr(reg, key):
            setattr(reg, key, value)
    
    reg.current_step = max(reg.current_step, step_number)
    await reg.save()
    return reg

@router.post("/payment-proof")
async def upload_payment_proof(file: bytes, user: dict = Depends(get_current_user)):
    reg = await Registration.find_one({"user_id": user["id"]})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not initialized")
    
    # Logic for saving the file and getting URL
    # For now, return a dummy URL since we don't have S3 or local disk storage logic defined
    dummy_url = f"/uploads/proof_{user['id']}_{reg.current_step}.pdf"
    
    # Save dummy URL to reg depending on current phase
    # In practice, frontend would send phase alongside, or we deduce
    if reg.current_step <= 4:
        reg.payment_proof_phase_1 = dummy_url
    else:
        reg.payment_proof_phase_2 = dummy_url
        
    await reg.save()
    return {"url": dummy_url}
