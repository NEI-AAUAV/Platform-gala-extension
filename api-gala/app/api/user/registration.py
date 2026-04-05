from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.api.auth import get_current_user
from app.models.registration import Registration
from pydantic import BaseModel
from app.services.storage import storage_client
import time

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
async def upload_payment_proof(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    reg = await Registration.find_one({"user_id": user["id"]})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not initialized")
    
    # Read file content
    content = await file.read()
    
    # Generate unique key for R2
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "file"
    timestamp = int(time.time())
    key = f"gala/proofs/{user['id']}_{timestamp}.{file_ext}"
    
    # Upload to R2
    url = storage_client.upload_image(key, content, file.content_type)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")
    
    # Save URL to reg depending on current phase
    # In Step 4, we might be phase 1 or phase 2.
    # However, the frontend should decide which field to update or the backend should handle it based on some logic.
    # To keep it simple and correct, we'll return the URL and let the frontend handle the update via update_registration_step
    # Actually, the user's request says we should be able to visualize the proofs.
    # For now, it's just returning the URL. Step4Payment onUpdate will then call update_registration_step with the URL.
    
    # But wait, looking at the code, it seems Step4Payment calls update_registration_step indirectly through onUpdate.
    return {"url": url}
