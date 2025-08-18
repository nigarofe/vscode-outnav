Software development {"action":"display_image","src":"media/2025-08-18.png","alt":"Diagram","width":400}
    EARS patterns definitions
        Generic
            While <optional_pre-condition>, when <trigger>, the <system_name> shall <system_response>
        Ubiquitous
            The <system_name> shall <system_response>
        State driven
            While <precondition(s)>, the <system_name> shall <system_response>
        Event driven
            When <trigger>, the <system_name> shall <system_response>
        Optional feature
            Where <feature_is_included>, the <system_name> shall <system_response>
        Unwanted behavior
            If <trigger>, the <system_name> shall <system_response>
        Complex
            While <precondition(s)>, when <trigger>, the <system_name> shall <system_response>
    vscode-outnav - Requirements for AI agent        
        npm dependencies and initialization
            The Extension shall be initialized using "npm install --global yo generator-code; yo code; npm install katex; npm install bootstrap;"
        Commands
            vscode-outnav.startOutlineNavigator
                When the command vscode-outnav.startOutlineNavigator is executed, the Extension shall parse Outlines.md to /json_exports/outlines.json according to /json_exports/outlines_schema.json
                When the Outlines.md has been sucessfully parsed, the Extension shall open the webview
        Markdown parsing
            The Extension shall parse outline content from Outlines.md using an indented-outline format where indentation is expressed as tabs or as groups of four spaces; the parser shall convert those headings into the JSON outline structure written to outlines.json following outlines_schema.json
        General
            The Extension shall assume that the user opened VS Code from the outnav-workspace folder
        Webview
            General
                The Extension shall provide a single webview
                When VS Code is opened, the Extension shall read the content of outnav-workspace/json_exports/outlines.json
                The webview shall use Bootstrap
            Breadcrumb navigation
                The Breadcrumb Component shall display a horizontal list of links representing the user's navigation path from the homepage.
                The breadcrumb shall show only ancestor titles (not the currently-selected title) in the breadcrumb chain; the final/current title shall be rendered in the dropdown button to avoid duplication.
                The Breadcrumb Component shall render the final item in the path as a dropdown control.
                The Breadcrumb Component shall populate the dropdown control with a list of all sibling pages of the current page.
                While the webview is in focus, the Breadcrumb Component shall sequentially cycle the displayed text of the dropdown control through each sibling page title every 1.0 second.
                While the dropdown text is cycling, when the user hovers over or clicks the dropdown control, the Breadcrumb Component shall immediately pause the cycling.
                Clicking the dropdown button shall toggle the sibling list open/closed (the webview should implement a lightweight toggle so Bootstrap JS is not required).
                Selecting a sibling from the dropdown shall navigate to that sibling, update the main content area, reset the dropdown text to the selected title, and hide the dropdown.
            Main content
                The webview shall have a single main content area that is visually distinct from the breadcrumb navigation and shall occupy the majority of the webview space
                When the breadcrumb selection changes, the Extension shall update the main content area within to reflect the new selection
                The main content area shall support multiple content renderers
                The Extension shall choose the renderer of the main content based on the selected title's annotations 
                Any image annotations that reference local workspace files (for example `media/2025-08-18.png`) shall be converted to webview-accessible URIs by the Extension before being embedded into the webview to avoid access errors (net::ERR_ACCESS_DENIED).
            Title annotations
                If there aren't any annotations on the title, the main content shall be empty
                Annotation format: trailing JSON object. Example:
                    Diagram {"action":"display_image","src":"images/2025-08-18.png","alt":"Diagram","width":400}
                Web link example:
                    Open docs {"action":"open_webpage","url":"https://example.com","key":"O"}
               Outline Question generator example:
                    Questions about Outlines.md {"action":"generate_outline_question"}
            Outline Question Generator
                When a title with the annotation {"action":"generate_outline_question"} is selected, the Extension shall render the Outline Question Generator in the main content area.
                The Outline Question Generator shall have two modes: "Level Identification" and "Outline Reconstruction".
                In "Level Identification" mode, the Extension shall display a randomly selected title from outlines.json and prompt the user to identify its correct level.
                In "Outline Reconstruction" mode, the Extension shall display a set of titles from outlines.json and require the user to drag and drop them into their correct hierarchical positions.
            Keyboard shortcuts
                While the webview is in focus, when the 
                    `Space` key is pressed, the webview shall pause/play the title cycling
                    `Esc` key is pressed, the webview tab shall close
                    `=`/`-` keys are pressed, the title cycling frequency shall decrease/increase
                    `A`/`D` keys are pressed, the title level shall decrease/increase
                    `J`/`L` keys are pressed, the title shall change to previous/next
Learning by questions
    Show reference materials
        Mathematics
            Algebra
            Linear Algebra
            Geometry
            Differential Equation
            Calculus
        Engineering
            Fluid Mechanics
                Quantities and units
                    Reynolds number {"action":"open_webpage","url":"https://en.wikipedia.org/wiki/Reynolds_number","key":"O"}
                Types of flow {"action":"open_webpage","url":"https://en.wikipedia.org/wiki/Laminar_flow","key":"O"}
                    Turbulent
                    Laminar
                Types of Non-Newtonian Fluids
                    Shear-thickening
                    Shear-thinning
                    Thixotropic
                    Rheopectic
                    Bingham plastics
            Continuum Mechanics
                Por que o Tensor Tensão é simétrico
                Tensor Tensão vs Tensor Deformação
                Nome das variáveis e tensores mais utilizados em Mecânica dos sólidos
                Definição coeficiente de Poisson
                Ângulos diretores e cossenos diretores
                Relação entre estresse e pressão
            Classical Mechanics
                Movimento sub-amortecido
    Show questions
        Questions about Outlines.md {"action":"generate_outline_question"}
        Order by PMG-X desc
        Order by DSLA
        Order by question number
Matérias UFMG
    EMA091 Mecânica dos Fluidos
        Conteúdos
            Livro Introdução à Mecânica dos Fluidos (Fox)
                    Capítulos
                        1. INTRODUÇÃO
                        2. CONCEITOS FUNDAMENTAIS
                        3. ESTÁTICA DOS FLUIDOS
                        4. EQUAÇÕES BÁSICAS NA FORMA INTEGRAL PARA UM VOLUME DE CONTROLE
            Vídeos
    EMA093 Processos de Fabricação por Usinagem
    EES039 Análise Estrutural
    EMC029 Seleção de materiais
    MAT015 Equações Diferenciais A
Employment
    Professional certifications
        IELTS
        TOELF
    Internships
        Siemens
        Kot
    Public tender
        CBMMG
        PMMG
The Great Mental Models book series
    General thinking concepts
        The Map is not the Territory
        Circle of Competence
        First Principles Thinking
        Thought Experiment
        Second-Order Thinking
        Probabilistic Thinking
        Inversion
        Occam's Razor
        Hanlon's Razor
    Physics
        Relativity
        Reciprocity
        Thermodynamics
        Inertia
        Friction and viscosity
        Velocity
        Leverage
    Chemistry
        Activation energy
        Catalysts
        Alloying
    Biology
        Evolution part one: Natural selection and extinction
        Evolution part two: Adaptation rate and the Red Queen Effect
        Competition
        Ecosystem
        Niches
        Self-Preservation
        Replication
        Cooperation
    Systems
        Feedback loops
        Equilibrium
        Bottlenecks
        Scale
        Margin of safety
        Churn
        Algorithms
        Critical mass
        Emergence
        Irreducibility
        The law of diminishin returns
    Mathematics
        Compounding
        Sampling
        Randomness
        Regression to the mean
        Multiplying by zero
        Equivalence
        Surface area
        Global and local maxima
    Economics
        Scarcity
        Supply and demand
        Optimization
        Trade-offs
        Specialization
        Interdependence
        Efficiency
        Debt
        Monooly and competition
        Creative destruction
        Gresham's law
        Bubbles
    Art
        Audience
        Genre
        Contrast
        Framing
        Rhytm
        Melody
        Representation
        Plot
        Character
        Setting
        Performance
