# Authored frontend source

`dashboard/` contains the project's authored components and scoped CSS. It does not contain the Data app shell, runtime, public component facade, compiler or built HTML.

The relative `../../data-app-public.jsx` imports refer to the original Data app component API. They are preserved as integration references; the module is deliberately not distributed here. This directory is not a standalone npm frontend project and no placeholder runtime is supplied.

The complete prototype needs a separately authorized compatible Data app installation, reviewed data metadata and a build using that installation's supported workflow. This repository does not grant access or redistribute that installation. The public backend/model tests do not depend on it.
