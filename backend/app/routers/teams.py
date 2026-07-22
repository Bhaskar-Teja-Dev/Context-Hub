import uuid
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from app.auth import get_current_user
from app.database import get_supabase, db_mem

router = APIRouter(prefix="/api/v1/teams", tags=["Teams & Collaboration"])

@router.post("")
def create_team(name: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Creates a new team and adds the creator as the owner."""
    team_id = str(uuid.uuid4())
    member_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()
    sp = get_supabase()

    if sp:
        try:
            # 1. Insert Team
            team_res = sp.table("teams").insert({
                "id": team_id,
                "name": name,
                "owner_id": current_user["id"]
            }).execute()

            # 2. Insert Creator as Owner Member
            sp.table("team_members").insert({
                "id": member_id,
                "team_id": team_id,
                "user_id": current_user["id"],
                "email": current_user["email"],
                "github_id": current_user.get("github_username"),
                "role": "owner",
                "joined_at": now_str
            }).execute()

            return team_res.data[0] if team_res.data else {"id": team_id, "name": name}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # In-memory fallback
    db_mem.teams[team_id] = {
        "id": team_id,
        "name": name,
        "owner_id": current_user["id"],
        "created_at": now_str
    }
    db_mem.team_members[member_id] = {
        "id": member_id,
        "team_id": team_id,
        "user_id": current_user["id"],
        "email": current_user["email"],
        "github_id": current_user.get("github_username"),
        "role": "owner",
        "joined_at": now_str,
        "created_at": now_str
    }
    return db_mem.teams[team_id]

@router.get("")
def list_teams(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lists all teams the user belongs to (as owner or member)."""
    sp = get_supabase()
    if sp:
        try:
            # Get teams where user is member or owner
            mem_res = sp.table("team_members").select("team_id").eq("user_id", current_user["id"]).execute()
            team_ids = [m["team_id"] for m in mem_res.data] if mem_res.data else []
            
            # Include owned teams
            owned_res = sp.table("teams").select("id").eq("owner_id", current_user["id"]).execute()
            if owned_res.data:
                team_ids.extend([t["id"] for t in owned_res.data])
            
            team_ids = list(set(team_ids))
            if not team_ids:
                return []

            teams_res = sp.table("teams").select("*").in_("id", team_ids).execute()
            return teams_res.data or []
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # In-memory search
    user_team_ids = [
        m["team_id"] for m in db_mem.team_members.values()
        if m["user_id"] == current_user["id"]
    ]
    owned_team_ids = [
        t["id"] for t in db_mem.teams.values()
        if t["owner_id"] == current_user["id"]
    ]
    all_ids = list(set(user_team_ids + owned_team_ids))
    return [t for t in db_mem.teams.values() if t["id"] in all_ids]

@router.post("/{team_id}/invite")
def invite_member(
    team_id: str,
    email: Optional[str] = None,
    github_id: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generates an invitation. If GitHub ID is supplied, it is logged for auto-joining upon target user login."""
    if not email and not github_id:
        raise HTTPException(status_code=400, detail="Must provide email or GitHub ID to invite.")

    sp = get_supabase()
    invite_id = str(uuid.uuid4())
    token = f"ch_invite_{secrets.token_hex(16)}"
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    now_str = datetime.now(timezone.utc).isoformat()

    # Check permission (must be owner or member of the team)
    is_authorized = False
    if sp:
        check = sp.table("team_members").select("id").eq("team_id", team_id).eq("user_id", current_user["id"]).execute()
        if check.data:
            is_authorized = True
    else:
        for m in db_mem.team_members.values():
            if m["team_id"] == team_id and m["user_id"] == current_user["id"]:
                is_authorized = True
                break

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to invite to this team.")

    if sp:
        try:
            sp.table("invitations").insert({
                "id": invite_id,
                "team_id": team_id,
                "email": email,
                "github_id": github_id,
                "created_by": current_user["id"],
                "token": token,
                "expires_at": expires_at
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    else:
        db_mem.invitations[invite_id] = {
            "id": invite_id,
            "team_id": team_id,
            "email": email,
            "github_id": github_id,
            "created_by": current_user["id"],
            "token": token,
            "expires_at": expires_at,
            "created_at": now_str
        }

    return {
        "invite_id": invite_id,
        "token": token,
        "invite_link": f"/invite/{token}",
        "github_id": github_id,
        "email": email,
        "expires_at": expires_at,
        "status": "invited"
    }

@router.post("/invite/claim")
def claim_invite(token: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Claims a shared invite token and joins the team."""
    sp = get_supabase()
    now_str = datetime.now(timezone.utc).isoformat()

    if sp:
        try:
            inv_res = sp.table("invitations").select("*").eq("token", token).execute()
            if not inv_res.data:
                raise HTTPException(status_code=404, detail="Invitation not found.")
            invite = inv_res.data[0]

            # Check expiry
            if datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
                sp.table("invitations").delete().eq("id", invite["id"]).execute()
                raise HTTPException(status_code=410, detail="Invitation expired.")

            # Add to team_members
            member_id = str(uuid.uuid4())
            sp.table("team_members").insert({
                "id": member_id,
                "team_id": invite["team_id"],
                "user_id": current_user["id"],
                "email": current_user["email"],
                "github_id": current_user.get("github_username"),
                "role": "member",
                "joined_at": now_str
            }).execute()

            # Delete the invitation after claiming
            sp.table("invitations").delete().eq("id", invite["id"]).execute()
            return {"status": "joined", "team_id": invite["team_id"]}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Claim invite error: {str(e)}")

    # In-memory claim
    invite = None
    for inv in db_mem.invitations.values():
        if inv["token"] == token:
            invite = inv
            break

    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    if datetime.fromisoformat(invite["expires_at"]) < datetime.now(timezone.utc):
        db_mem.invitations.pop(invite["id"])
        raise HTTPException(status_code=410, detail="Invitation expired.")

    member_id = str(uuid.uuid4())
    db_mem.team_members[member_id] = {
        "id": member_id,
        "team_id": invite["team_id"],
        "user_id": current_user["id"],
        "email": current_user["email"],
        "github_id": current_user.get("github_username"),
        "role": "member",
        "joined_at": now_str,
        "created_at": now_str
    }
    db_mem.invitations.pop(invite["id"])
    return {"status": "joined", "team_id": invite["team_id"]}

@router.post("/auto-join")
def auto_join_github(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Automatically joins any teams where a pending invitation exists for the user's GitHub ID or email."""
    github_name = current_user.get("github_username")
    email = current_user.get("email")
    if not github_name and not email:
        return {"joined_teams": []}

    sp = get_supabase()
    joined = []
    now_str = datetime.now(timezone.utc).isoformat()

    if sp:
        try:
            # Query invites matching github_id or email
            inv_query = sp.table("invitations").select("*")
            if github_name and email:
                inv_query = inv_query.or_(f"github_id.eq.{github_name},email.eq.{email}")
            elif github_name:
                inv_query = inv_query.eq("github_id", github_name)
            else:
                inv_query = inv_query.eq("email", email)
            
            invs = inv_query.execute()
            if invs.data:
                for invite in invs.data:
                    # Ignore expired
                    if datetime.fromisoformat(invite["expires_at"].replace("Z", "+00:00")) < datetime.now(timezone.utc):
                        continue
                    
                    # Add to team_members
                    member_id = str(uuid.uuid4())
                    sp.table("team_members").insert({
                        "id": member_id,
                        "team_id": invite["team_id"],
                        "user_id": current_user["id"],
                        "email": current_user["email"],
                        "github_id": github_name,
                        "role": "member",
                        "joined_at": now_str
                    }).execute()
                    
                    # Clean invite
                    sp.table("invitations").delete().eq("id", invite["id"]).execute()
                    joined.append(invite["team_id"])
        except Exception as e:
            # Log error but don't fail login
            pass
        return {"joined_teams": joined}

    # In-memory auto-join
    to_delete = []
    for inv in list(db_mem.invitations.values()):
        is_match = False
        if github_name and inv.get("github_id") == github_name:
            is_match = True
        elif email and inv.get("email") == email:
            is_match = True

        if is_match:
            member_id = str(uuid.uuid4())
            db_mem.team_members[member_id] = {
                "id": member_id,
                "team_id": inv["team_id"],
                "user_id": current_user["id"],
                "email": current_user["email"],
                "github_id": github_name,
                "role": "member",
                "joined_at": now_str,
                "created_at": now_str
            }
            to_delete.append(inv["id"])
            joined.append(inv["team_id"])

    for i_id in to_delete:
        db_mem.invitations.pop(i_id)

    return {"joined_teams": joined}

@router.get("/{team_id}/members")
def list_team_members(team_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lists all members in the team."""
    sp = get_supabase()
    if sp:
        try:
            # Check user is member
            check = sp.table("team_members").select("id").eq("team_id", team_id).eq("user_id", current_user["id"]).execute()
            if not check.data:
                raise HTTPException(status_code=403, detail="Not a member of this team.")
            
            res = sp.table("team_members").select("*").eq("team_id", team_id).execute()
            return res.data or []
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # In-memory check
    is_member = False
    for m in db_mem.team_members.values():
        if m["team_id"] == team_id and m["user_id"] == current_user["id"]:
            is_member = True
            break
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this team.")

    return [m for m in db_mem.team_members.values() if m["team_id"] == team_id]
