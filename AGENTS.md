<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Generate point-photo signed URLs only in server functions after verifying publication or admin access, because the storage bucket is private.
- Enforce the public geographic scope in database policies and server functions, because UI-only filters can be bypassed.
- Render maps with the Google Maps browser connector while keeping Places and geocoding requests server-side, because browser credentials are rendering-only.
- Persist public-action rate limits by keyed request hash in the database, because server instances are stateless and raw IP addresses must not be stored.
